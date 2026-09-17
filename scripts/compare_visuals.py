"""Compare 390×844 runtime captures with the approved UI baselines."""

from pathlib import Path
import sys

from PIL import Image, ImageChops, ImageStat


ROOT = Path(__file__).resolve().parents[1]
BASELINE_DIR = ROOT / "design-previews"
CURRENT_DIR = ROOT / "visual-regression"
MAX_MEAN_ABSOLUTE_ERROR = 3.0


def compare_pair(baseline_path: Path, current_path: Path) -> tuple[float, float]:
    baseline = Image.open(baseline_path).convert("RGB")
    current = Image.open(current_path).convert("RGB")
    if baseline.size != current.size:
        raise ValueError(f"尺寸不一致：设计稿 {baseline.size}，运行截图 {current.size}")

    difference = ImageChops.difference(baseline, current)
    statistics = ImageStat.Stat(difference)
    mean_error = sum(statistics.mean) / len(statistics.mean)
    similarity = max(0.0, 100 * (1 - mean_error / 255))
    return mean_error, similarity


def main() -> int:
    failed = False
    baselines = sorted(BASELINE_DIR.glob("[0-9][0-9]-*.png"))
    baselines = [path for path in baselines if not path.name.startswith("00-")]

    for baseline in baselines:
        current = CURRENT_DIR / f"{baseline.stem}-current.png"
        if not current.exists():
            print(f"缺少运行截图：{current.name}")
            failed = True
            continue

        try:
            mean_error, similarity = compare_pair(baseline, current)
        except ValueError as error:
            print(f"{baseline.name}：{error}")
            failed = True
            continue

        result = "通过" if mean_error <= MAX_MEAN_ABSOLUTE_ERROR else "偏差过大"
        print(
            f"{baseline.name}：{result}，"
            f"平均像素差 {mean_error:.3f}/255，相似度 {similarity:.3f}%"
        )
        failed = failed or mean_error > MAX_MEAN_ABSOLUTE_ERROR

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
