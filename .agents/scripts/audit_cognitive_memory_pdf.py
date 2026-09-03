from pathlib import Path
import fitz

pdf_path = Path("attached_assets/Project_LEE_Cognitive_Runtime_Long_Term_Memory_Architecture_1788412751441.pdf")
out_dir = Path(".agents/outputs/cognitive-memory-pdf")
out_dir.mkdir(parents=True, exist_ok=True)

doc = fitz.open(pdf_path)
print(f"pages={doc.page_count}")
print(f"metadata={doc.metadata}")

for index, page in enumerate(doc):
    text = page.get_text("text")
    (out_dir / f"page-{index + 1:02d}.txt").write_text(text, encoding="utf-8")
    pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
    pix.save(out_dir / f"page-{index + 1:02d}.png")
    print(f"page={index + 1} chars={len(text)} images={len(page.get_images(full=True))}")

full_text = "\n\n".join(
    (out_dir / f"page-{index + 1:02d}.txt").read_text(encoding="utf-8")
    for index in range(doc.page_count)
)
(out_dir / "full-text.txt").write_text(full_text, encoding="utf-8")
print(f"full_text_chars={len(full_text)}")