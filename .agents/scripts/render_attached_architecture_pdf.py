from pathlib import Path
import fitz

src = Path("attached_assets/Project_LEE_Replit_Architecture_Refactor_Command_1787284016913.pdf")
out = Path(".agents/outputs/attached-architecture-pdf")
out.mkdir(parents=True, exist_ok=True)

doc = fitz.open(src)
print("pages", len(doc), "metadata", doc.metadata)
for index, page in enumerate(doc):
    pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
    target = out / f"page-{index + 1:02d}.png"
    pix.save(target)
    print(target)