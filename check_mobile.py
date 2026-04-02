with open(r"e:\dashboard vital dental\frontend\src\App.jsx", encoding="utf-8") as f:
    txt = f.read()
checks = {
    "isMobile in JSX": "isMobile" in txt,
    "mobileApptDate": "mobileApptDate" in txt,
    "useIsMobile hook": "useIsMobile" in txt,
    "bottom nav": "Mobile Bottom Navigation" in txt,
    "mobile appts layout": "MOBILE appointments layout" in txt,
    "date strip": "dateStrip" in txt,
    "isMobile modal prop": "isMobile={isMobile} title" in txt,
    "patient detail flex-direction": "flexDirection: isMobile" in txt,
    "patient detail padding 14": "isMobile ? 14 : 32" in txt,
    "patient sidebar sticky fix": "isMobile ? 0 : 32" in txt,
}
for k, v in checks.items():
    print(f"{'OK' if v else 'MISSING'} {k}")
