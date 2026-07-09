# B737 理论练习题 HTML 系统

## 使用方式

直接用浏览器打开：

```text
练习题系统/html/index.html
```

当前版本为静态离线版，不需要服务器或网络。题库数据来自：

- `练习题系统/html/assets/question-bank.js`

手册依据的人工覆盖来源：

- `练习题系统/manual-references.json`
- `练习题系统/手册依据摘录.md`

## 当前功能

- 首页显示"B737 理论练习题"。
- 按系统分类进入题目列表（含"待确认分类"入口）。
- 每次显示一道题。
- 选择答案后即时判断：
  - 答错显示红色提示。
  - 答对显示绿色提示。
  - 下方显示答案参考说明。
- 支持全部题目练习。
- 支持分类练习。
- 支持随机顺序。
- 支持错题本。
- 支持导出错题 Markdown。
- 支持本地保存作答进度。
- 支持题干、分类、标签和来源搜索。
- 支持按答案依据状态筛选：`partial`、`insufficient`、`conflict`、`event-reference`、`verified`。
- 默认从正式练习中排除 `conflict` 题；勾选"包含冲突题"或筛选 `conflict` 时可进入审核。
- 分类卡片显示答案依据状态小计：`V` 为 verified，`P` 为 partial，`I` 为 insufficient，`C` 为 conflict。
- 导出错题功能修复（正确的换行符）。

## 题库状态

当前版本：**v0.2.0**

| 状态 | 数量 | 说明 |
|------|------|------|
| verified | 171 | 已完成手册原文验证 |
| partial | 230 | 有原题库 FCOM 章节参考线索，映射至对应手册章节 |
| insufficient | 621 | 来自机考 900 题（仅答案），标注了题干关键词识别领域 |
| conflict | 5 | 400 总与 900 题答案冲突，默认不进入正式练习 |
| **合计** | **1027** | |

### partial 题改进

`partial` 状态题的答案参考说明从原始格式：

> 原始 400 总题库参考字段为"4.10.5"，该字段可作为后续手册定位线索……

升级为：

> 原题库参考定位至《B737_NG_FCOM.pdf》第4章（自动飞行）第10.5节。本题考点涉及自动飞行相关内容……

### insufficient 题改进

`insufficient`（机考 900 题）从统一的"尚未完成手册原文核对"文本，升级为：

- 事件相关题：标注具体事件子类（跑道侵入、通讯中断等）
- 普通题：标注题干识别的关键词领域（放行、发动机、液压等）

## 构建流程

更新 `manual-references.json` 后重新运行：

```text
cd 练习题系统
python3 scripts/batch_reference_builder.py        # 批量生成 manual-references
~/.hermes/hermes-agent/venv/bin/python3.11 scripts/build_question_system.py  # 重建所有产出
```

## 目录结构

```text
html/
├── index.html              # 主页面
├── styles.css              # 样式
├── app.js                  # 应用逻辑
├── README.md               # 本文件
└── assets/
    └── question-bank.js    # 题库数据（JavaScript 格式）
```
