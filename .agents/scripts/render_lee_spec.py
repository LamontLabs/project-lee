from pathlib import Path

import fitz


source = Path("attached_assets/Project_LEE_UI_and_CIL_Implementation_Specification_1787545923945.pdf")
output = Path(".agents/outputs/lee-spec-pages")
output.mkdir(parents=True, exist_ok=True)

document = fitz.open(source)
print(f"pages={document.page_count}")
for index, page in enumerate(document):
    pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    target = output / f"page-{index + 1:02d}.png"
    pixmap.save(target)
    print(target)