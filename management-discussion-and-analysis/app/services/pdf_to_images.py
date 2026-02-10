"""
Convert PDF pages to PIL Image objects using pdf2image (poppler).
"""

from pathlib import Path
from PIL import Image
from pdf2image import convert_from_path


def pdf_to_images(
    pdf_path: Path,
    page_from: int | None = None,
    page_to: int | None = None,
    dpi: int = 300,
) -> list[Image.Image]:
    """
    Convert a PDF file to a list of PIL Images.

    Args:
        pdf_path:   Path to the PDF file.
        page_from:  1-based first page (inclusive). None = first page.
        page_to:    1-based last page (inclusive). None = last page.
        dpi:        Resolution for rendering.

    Returns:
        List of PIL Image objects, one per page.
    """
    kwargs: dict = {"dpi": dpi}
    if page_from is not None:
        kwargs["first_page"] = page_from
    if page_to is not None:
        kwargs["last_page"] = page_to

    try:
        images = convert_from_path(str(pdf_path), **kwargs)
    except Exception as exc:
        raise RuntimeError(
            f"pdf2image failed — is poppler installed and on PATH? "
            f"Error: {exc}"
        ) from exc

    return images


def load_images_from_dir(
    directory: Path,
    page_from: int | None = None,
    page_to: int | None = None,
) -> list[Image.Image]:
    """
    Load image files from a directory, sorted by filename.

    Args:
        directory:  Folder containing .png / .jpg / .jpeg files.
        page_from:  1-based start index (inclusive).
        page_to:    1-based end index (inclusive).

    Returns:
        List of PIL Image objects.
    """
    extensions = {".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp"}
    files = sorted(
        [f for f in directory.iterdir() if f.suffix.lower() in extensions]
    )

    if not files:
        raise FileNotFoundError(
            f"No image files found in {directory}"
        )

    # Apply page range (1-based)
    start = (page_from - 1) if page_from else 0
    end = page_to if page_to else len(files)
    files = files[start:end]

    return [Image.open(f).convert("RGB") for f in files]
