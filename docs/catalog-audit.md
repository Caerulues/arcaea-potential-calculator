# 曲库更新核对

来源：用户粘贴的 Arcaea 中文维基定数表。原始资料的 SHA-256、逐曲链接、定数快照和变更列表保存在 `static/wiki-constants.json`。本次没有在线核验该表的更新时间。

- 表格包含 552 条曲目记录、1,830 个谱面定数。
- 修正 6 个已有定数，新增 104 个原曲库没有的谱面定数。
- 新增 27 条曲目记录；27 首现均已对应游戏 ID，包括 sacrosanct。原先 9 个临时查阅键已根据本机游戏 songlist 替换。
- 表格没有物量、曲师或难度标级。已有物量全部保留，104 张新增谱面中，89 张物量已由本地 AFF 补齐，15 张保持未知；缺失标级显示问号，不从定数推测。缺失物量的谱面无法手动录入，但 CSV 导入照常可用。
- 同名曲 Quon、Genesis 及 Last / Last | Eternity 分别映射。BYD/INS 与 ETR 使用表格中的独立列。
- CSV 原始定数和单曲 Potential 保留；本次曲库更新不重新计算 CSV 历史成绩。

## 本地游戏 ID 核对

来源：用户指定的 Arcaea Data 目录内 `Library/Application Support/cb/active/songs/songlist`，包含 553 首曲目。网站所有曲目 ID 均存在于该清单，待补全数为 0。来源哈希和映射保存在 `static/wiki-constants.json`。游戏文件未修改。

| 曲名 | 游戏 ID |
| --- | --- |
| Love me, Love me, Love me | `aishite` |
| c.s.q.n. | `csqn` |
| Riot in the System | `riotsystem` |
| Sucromania | `sucromania` |
| God-ish | `kamippoi` |
| MIRROR - kamome sano remix | `mirrorrmx` |
| flexidefine | `flexidefine` |
| Cosmogyral | `cosmogyral` |
| Altersist | `altersist` |

## CSV 匹配结果

用户确认 ⊥⊬ 的游戏内 ID 为 sacrosanct，现已补全。用户 CSV 的曲目均已匹配。

曲目查询已取消物量显示，保留内部物量数据供其他计算使用。

## 本地谱面物量核对

读取本体 songs 目录的 AFF 和 Documents/dl 的下载谱面，成功计算 1,246 张。1,156 张与原曲库一致，新增补齐 89 张；CSV 中可交叉验证的 438 张均与 Pure + Far + Lost 一致（排除 Track Lost）。计数结果、文件相对路径和 SHA-256 见 `static/local-note-counts.json`。

仍缺少 sacrosanct 的 PST/PRS/FTR，以及 csqn、sucromania、altersist 的 PST/PRS/FTR/ETR，共 15 张的本地文件。保留未知值，未猜测。primevaltexture PST 本地计算为 387，旧库为 346，暂保留旧值并列为待复核，避免无独立证据时覆盖已有成绩计算依据。

计数器 `tools/count_notes.py` 依据 BSD-3-Clause 开源计数算法，处理浮点精度、音弧衔接、密度和 noinput；许可证随附。运行 `python3 tools/test_count_notes.py` 验证。网站未包含游戏谱面原文，游戏目录未修改。曲目查询继续隐藏物量。
