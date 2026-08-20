import fitz
from pathlib import Path
pdf = Path('attached_assets/Project_LEE_(2)_1787254504186.pdf')
out = Path('.agents/outputs/project-lee-pdf')
out.mkdir(parents=True, exist_ok=True)
doc = fitz.open(pdf)
print('pages', doc.page_count)
print('metadata', doc.metadata)
for i, page in enumerate(doc):
    pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
    path = out / f'page-{i+1:03d}.png'
    pix.save(path)
    text = page.get_text('text')
    (out / f'page-{i+1:03d}.txt').write_text(text)
    print(i+1, page.rect, 'text_chars', len(text), 'images', len(page.get_images(full=True)))
