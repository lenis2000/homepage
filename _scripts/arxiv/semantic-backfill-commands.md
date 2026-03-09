# Semantic Backfill Commands — by Month (Kaggle DB)

Uses `make arxiv-scan` (local Kaggle SQLite, no API calls).

```bash
cd ~/Homepage
# Prerequisite: make arxiv-kaggle (downloads + imports Kaggle dataset)
```

## Pre-2007 (old-style IDs: archive/YYMMNNN)

Scan by archive — each covers the full history of that archive.

```bash
make arxiv-scan ARGS="--id-prefix math/ --threshold 0.78"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix math-ph/ --threshold 0.78"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix hep-th/ --threshold 0.78"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix cond-mat/ --threshold 0.78"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
<!-- make arxiv-scan ARGS="--id-prefix nlin/ --threshold 0.78" -->
<!-- arxiv-review _scripts/arxiv/scan-review.json -->
<!-- make arxiv-scan-import && make arxiv-rebuild -->
```

```bash
<!-- make arxiv-scan ARGS="--id-prefix q-alg/ --threshold 0.78" -->
<!-- arxiv-review _scripts/arxiv/scan-review.json -->
<!-- make arxiv-scan-import && make arxiv-rebuild -->
```

```bash
<!-- make arxiv-scan ARGS="--id-prefix solv-int/ --threshold 0.78" -->
<!-- arxiv-review _scripts/arxiv/scan-review.json -->
<!-- make arxiv-scan-import && make arxiv-rebuild -->
```

## 2007 (new-style IDs start April 2007)

```bash
make arxiv-scan ARGS="--id-prefix 0704"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 0705"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 0706"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 0707"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 0708"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 0709"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 0710"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 0711"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 0712"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

## 2008

```bash
make arxiv-scan ARGS="--id-prefix 0801"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 0802"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 0803"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 0804"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 0805"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 0806"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 0807"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 0808"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 0809"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 0810"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 0811"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 0812"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

## 2009

```bash
make arxiv-scan ARGS="--id-prefix 0901"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 0902"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 0903"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 0904"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 0905"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 0906"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 0907"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 0908"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 0909"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 0910"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 0911"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 0912"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

## 2010

```bash
make arxiv-scan ARGS="--id-prefix 1001"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1002"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1003"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1004"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1005"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1006"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1007"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1008"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1009"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1010"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1011"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1012"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

## 2011

```bash
make arxiv-scan ARGS="--id-prefix 1101"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1102"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1103"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1104"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1105"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1106"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1107"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1108"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1109"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1110"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1111"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1112"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

## 2012

```bash
make arxiv-scan ARGS="--id-prefix 1201"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1202"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1203"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1204"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1205"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1206"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1207"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1208"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1209"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1210"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1211"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1212"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

## 2013

```bash
make arxiv-scan ARGS="--id-prefix 1301"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1302"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1303"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1304"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1305"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1306"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1307"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1308"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1309"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1310"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1311"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1312"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

## 2014

<!-- DONE: 1401 -->

```bash
make arxiv-scan ARGS="--id-prefix 1402"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1403"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1404"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1405"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1406"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1407"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1408"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1409"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1410"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1411"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1412"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

## 2015

```bash
make arxiv-scan ARGS="--id-prefix 1501"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1502"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1503"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1504"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1505"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1506"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1507"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1508"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1509"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1510"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1511"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1512"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

## 2016

```bash
make arxiv-scan ARGS="--id-prefix 1601"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1602"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1603"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1604"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1605"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1606"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1607"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1608"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1609"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1610"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1611"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1612"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

## 2017

```bash
make arxiv-scan ARGS="--id-prefix 1701"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1702"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1703"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1704"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1705"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1706"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1707"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1708"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1709"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1710"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1711"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1712"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

## 2018

```bash
make arxiv-scan ARGS="--id-prefix 1801"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1802"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1803"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1804"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1805"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1806"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1807"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1808"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1809"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1810"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1811"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1812"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

## 2019

```bash
make arxiv-scan ARGS="--id-prefix 1901"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1902"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1903"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1904"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1905"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1906"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1907"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1908"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1909"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1910"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1911"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 1912"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

## 2020

```bash
make arxiv-scan ARGS="--id-prefix 2001"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2002"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2003"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2004"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2005"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2006"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2007"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2008"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2009"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2010"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2011"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2012"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

## 2021

```bash
make arxiv-scan ARGS="--id-prefix 2101"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2102"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2103"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2104"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2105"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2106"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2107"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2108"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2109"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2110"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2111"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2112"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

## 2022

```bash
make arxiv-scan ARGS="--id-prefix 2201"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2202"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2203"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2204"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2205"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2206"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2207"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2208"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2209"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2210"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2211"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2212"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

## 2023

```bash
make arxiv-scan ARGS="--id-prefix 2301"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2302"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2303"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2304"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2305"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2306"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2307"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2308"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2309"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2310"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2311"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2312"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

## 2024

```bash
make arxiv-scan ARGS="--id-prefix 2401"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2402"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2403"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2404"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2405"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2406"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2407"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2408"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2409"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2410"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2411"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2412"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

## 2025

```bash
make arxiv-scan ARGS="--id-prefix 2501"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2502"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2503"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2504"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2505"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2506"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2507"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2508"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2509"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2510"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2511"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2512"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

## 2026

```bash
make arxiv-scan ARGS="--id-prefix 2601"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2602"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```

```bash
make arxiv-scan ARGS="--id-prefix 2603"
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import && make arxiv-rebuild
rm -f _scripts/arxiv/scan-review.json
```
