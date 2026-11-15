#!/usr/bin/env python3
"""Trasforma un articolo scritto in Word (.docx) in un articolo di Bordo Vasca.

Uso:
    python3 strumenti/word_in_articolo.py ARTICOLO.docx --titolo "Titolo" --data 2026-11-15 [--sommario "..."]

Serve: pandoc; per le immagini EMF/WMF (tabelle e grafici incollati da Excel) LibreOffice (soffice);
per ridurre le foto grandi ImageMagick (convert). Scrive:
    src/content/articoli/<data>-<titolo>.md
    public/media/articoli/<data>-<titolo>/immagine-N.<ext>
Il risultato va riletto: titoletti, didascalie e formule sono riconosciuti con regole semplici.
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
LARGHEZZA_MAX = 1600


def slug(testo: str) -> str:
    s = unicodedata.normalize('NFD', testo)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower()
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s[:80].rstrip('-')


def caso_frase(t: str) -> str:
    """«IL PROBLEMA DELLA TRICLORAMMINA» o «evaporazione» → «Il problema della triclorammina», «Evaporazione»."""
    lettere = [c for c in t if c.isalpha()]
    maiuscole = sum(c.isupper() for c in lettere)
    if lettere and (maiuscole / len(lettere) > 0.6 or maiuscole == 0 or t[:1].islower()):
        t = t.lower()
        return t[:1].upper() + t[1:]
    return t


def converti_immagine(origine: Path, cartella: Path, n: int) -> str:
    est = origine.suffix.lower()
    if est in ('.emf', '.wmf'):
        # EMF/WMF (tabelle e grafici incollati da Excel): via PDF, poi PNG a 200 dpi, più leggibile della conversione diretta
        tmp = Path(tempfile.mkdtemp())
        destinazione = cartella / f'immagine-{n}.png'
        if shutil.which('pdftoppm'):
            subprocess.run(['soffice', '--headless', '--convert-to', 'pdf', '--outdir', str(tmp), str(origine)],
                           check=True, capture_output=True)
            subprocess.run(['pdftoppm', '-png', '-r', '200', '-singlefile', str(tmp / (origine.stem + '.pdf')),
                            str(tmp / 'alta')], check=True)
            convertita = tmp / 'alta.png'
        else:
            subprocess.run(['soffice', '--headless', '--convert-to', 'png', '--outdir', str(tmp), str(origine)],
                           check=True, capture_output=True)
            convertita = tmp / (origine.stem + '.png')
        # ritaglia i margini bianchi lasciati dalla conversione
        if shutil.which('convert'):
            subprocess.run(['convert', str(convertita), '-trim', '+repage', '-resize', f'{LARGHEZZA_MAX}x>',
                            '-bordercolor', 'white', '-border', '12', str(destinazione)], check=True)
        else:
            shutil.copy(convertita, destinazione)
        return destinazione.name
    est = '.jpg' if est == '.jpeg' else est
    destinazione = cartella / f'immagine-{n}{est}'
    if shutil.which('convert'):
        opzioni = ['-resize', f'{LARGHEZZA_MAX}x>', '-strip']
        if est == '.jpg':
            opzioni += ['-quality', '85']
        subprocess.run(['convert', str(origine), *opzioni, str(destinazione)], check=True)
    else:
        shutil.copy(origine, destinazione)
    return destinazione.name


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('docx', type=Path)
    ap.add_argument('--titolo', required=True)
    ap.add_argument('--data', required=True)
    ap.add_argument('--sommario', default='')
    ap.add_argument('--bozza', action='store_true')
    a = ap.parse_args()

    id_articolo = f'{a.data}-{slug(a.titolo)}'
    cartella_media = RADICE / 'public' / 'media' / 'articoli' / id_articolo
    cartella_media.mkdir(parents=True, exist_ok=True)
    lavoro = Path(tempfile.mkdtemp())
    shutil.copy(a.docx, lavoro / 'articolo.docx')
    subprocess.run(['pandoc', 'articolo.docx', '-t', 'gfm', '--wrap=none', '--extract-media=.', '-o', 'articolo.md'],
                   cwd=lavoro, check=True)
    testo = (lavoro / 'articolo.md').read_text(encoding='utf-8')

    # immagini: ognuna in un paragrafo a sé, convertite e rinominate nell'ordine in cui compaiono
    nomi: dict[str, str] = {}

    def immagine(m: re.Match) -> str:
        src = m.group(1)
        if src not in nomi:
            nomi[src] = converti_immagine(lavoro / src, cartella_media, len(nomi) + 1)
        return f'\n\n![](/media/articoli/{id_articolo}/{nomi[src]})\n\n'

    testo = re.sub(r'<img src="\.?/?([^"]+)"[^>]*/>', immagine, testo)
    testo = re.sub(r'!\[[^\]]*\]\((?:\./)?(media/[^)]+)\)', immagine, testo)
    testo = re.sub(r'<span class="smallcaps">(.*?)</span>', r'\1', testo)
    testo = re.sub(r'</?u>', '', testo)  # sottolineature di Word

    righe = testo.split('\n')
    uscita: list[str] = []
    ultima_immagine = False
    for riga in righe:
        r = riga.rstrip()
        nuda = re.sub(r'^>\s?', '', r).strip()
        # immagini e didascalie di tabelle non vanno nei rientri (blockquote) di Word
        if nuda.startswith('![') or re.fullmatch(r'\*\*(Tab|Fig)\.?.*\*\*', nuda, re.I):
            r = nuda
        # elenco con un'immagine dentro: l'immagine è già stata spostata, resta la voce
        r = re.sub(r'^(\s*[-*]\s*)$', '', r) if r.strip() in ('-', '*') else r
        m = re.fullmatch(r'\*\*(.+?)\*\*', r.strip())
        if m:
            contenuto = m.group(1).replace('\\_', '–').strip()
            if contenuto.lower() == 'fine':
                continue
            if contenuto.lower() == a.titolo.lower() and not uscita:
                continue  # il titolo è nell'intestazione
            # didascalia: «Tab./Fig. …», oppure testo in minuscolo subito dopo un'immagine
            dopo_immagine = ultima_immagine and contenuto[:1].islower()
            if re.match(r'(tab|fig)', contenuto, re.I) or dopo_immagine:
                uscita.append(f'*{caso_frase(contenuto) if dopo_immagine else contenuto}*')
            else:
                uscita.append(f'## {caso_frase(contenuto)}')
            ultima_immagine = False
            continue
        if re.match(r'^(Figura|Fig\.)\s*\d+', r.strip()):
            r = '*' + re.sub(r'\s*\\_\s*', ' – ', r.strip()) + '*'
        r = re.sub(r'\s*\\_\s*', ' – ', r) if '\\_' in r else r
        if r.strip():
            ultima_immagine = r.strip().startswith('![')
        uscita.append(r)

    corpo = re.sub(r'\n{3,}', '\n\n', '\n'.join(uscita)).strip() + '\n'
    intestazione = ['---', f'titolo: {json.dumps(a.titolo, ensure_ascii=False)}', f'data: {a.data}']
    if a.sommario:
        intestazione.append(f'sommario: {json.dumps(a.sommario, ensure_ascii=False)}')
    intestazione += [f'bozza: {"true" if a.bozza else "false"}', '---', '']
    destinazione = RADICE / 'src' / 'content' / 'articoli' / f'{id_articolo}.md'
    destinazione.write_text('\n'.join(intestazione) + '\n' + corpo, encoding='utf-8')
    print(f'{destinazione.relative_to(RADICE)}: {len(nomi)} immagini in {cartella_media.relative_to(RADICE)}')


if __name__ == '__main__':
    sys.exit(main())
