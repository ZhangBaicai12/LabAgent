# A+ DQE 可靠性測試工作流程（Rel Test Work Flow）

> 來源：work-flow.pptx（Pre EVT v.01，2026/6/5，報告人：DQE）
> 用途：流程梳理 + 後續 Agent 設計輸入文檔

---

## 0. 總覽

### 0.1 流程主線

```
倉庫領機(TT) → Cosmetic 外觀目檢 → 拍照 → Mini line 工站測試 → 報告/Recon → Test Center 測試(T0/TX/TF) → ↺ 循環
                                      ↑____________________________________________|
```

一台機台的生命周期分為三個測試階段，每個階段都走一遍相同的「外觀 → 拍照 → Mini line → 報告 → Recon → 測試」循環：

| 階段 | 說明 | 關鍵 TT 指標 |
|------|------|--------------|
| **T0** | 入庫後首次全面外觀 + 基線測試 | Pre TX TT：1.7 天；Cosmetic TT：2 小時；Mini line TT：2.2 天 |
| **TX** | 各 Function DRI 依 WF（Work Flow 分配）執行的分段測試 | 測試本體最長 20hr；Cosmetic TT：1.5 小時；Mini line TT：2.2 天 |
| **TF** | Last CP 測試完成，退庫 | Cosmetic TT：2 小時；Mini line TT：2.2 天 |

### 0.2 角色一覽

| 角色 | 人員 | 職責 |
|------|------|------|
| PM | — | 匯總產品信息、整合 EPM 組裝訊息、OK2REL Tracker 確認 |
| FX EPM | — | 郵件通知 DQE 領機 |
| 倉庫 | Lucy | 機台收發、掃 TT |
| Cosmetic 目檢 | Tammy | 清潔、秤重、目檢、色差、填 Travel Sheet |
| 拍照 | Lucky | Photo Station 拍攝、照片命名與上傳 |
| 照片複核 | Amy | 照片複核、補拍跟催、上傳 F1 硬盤/雷達 |
| Mini line | Jackson（工站/設備）、Frank（掃進/報告） | 工站測試、報告產出 |
| Report / Recon | Bole（報告）、Yoke（Recon 錄入、WF 分配） | 報告產出、Recon 錄入、WF 分配 |
| Test Center | Aiden / Cody / Operator | 實機測試、充電、Rootloader、設備維護 |
| 各 Function DRI | 多人 | 依 WF 執行測試、刷 Recon Tagging |
| F1 | — | WF 審核、Disposition（COF/FA 裁決） |
| FA | Kevin / Lisa / Fei / Mike / Yang / Xiaoyue | FA 分析、Disposition、FA Tracker |
| BCDC | Wen | 依 Test Plan 送測 |

### 0.3 核心流轉載體：Travel Sheet（紙本）

> ⚠️ **關鍵痛點載體**：目前所有跨環節信息（外觀問題、測試記錄、拍照勾選、補拍記錄）都手寫在紙本 Travel Sheet 上，靠人力物理傳遞（外觀→Recon→報告組→複核人員），是「一處修改多處重改」和「無電子化」的根源。


### 0.4 系統邊界（重要：決定 Agent 數據接入方式）

| 系統 | 歸屬 | 在流程中的作用 | Agent 接入預期 |
|------|------|----------------|----------------|
| **Recon** | 客戶系統 | Failure Item 錄入、Recon Tagging（Lab REL / Test failure mode / Test / TF Test / TF Lab / Dynamic 節點）、WF 分配依據、F1 Disposition 回覆 | 預期無開放 API，需評估 RPA/頁面自動化或人工確認節點 |
| **Radar** | 客戶系統 | 報告備份上傳、照片上傳、System Report/FA tracker 下載、Log 頁 csv 上傳、CT Tracker 發布、FA Dashboard 數據源 | 同上；涉及多個 radar（整機報告雷達、客戶指定雷達、雷達157525665） |
| **iMES** | 公司系統 | Summary IN/OUT 掃描、T0 測試結果判定 | 公司內部系統，優先爭取 API/DB 直連，是全流程狀態機的最佳掛載點 |
| IMES / Summary（Report 環節） | 公司系統 | Report Summary In/OUT | 同上 |
| **CTMS** | **公司自研系統** | CT Scan 申請/審核/狀態流轉（含「開始檢測/結束測試/關閉測試」節點） | 公司自研，**可爭取 API/DB 直連，優先級等同 iMES** |
| 共享文件館 / NAS / F1 硬盤 | 內部共享存儲 | Mini line 報告下載、照片暫存與備份 | Agent 可直接讀寫，無障礙 |
| Dashboard | 客戶系統 | Pass/Fail 數據發布 | 只讀下載場景 |

> **設計要點**：SSOT 狀態機若建在 iMES（公司系統）上，可自動獲取 Summary IN/OUT 事件；Recon/Radar 側的狀態回寫需預留「人工確認」或「RPA 代填」兩種模式，Agent 負責生成結構化數據與核對差異，而非假設能直接寫入客戶系統。
> 
> **公司側可完全自動化的系統**：iMES、CTMS（自研）。CT Lab 從申請、審核、掃描節點到結案全程在 CTMS 內流轉，若開放接口，Agent 可直接接管狀態推進與 16:00 Tracker 同步，無需人工節點。

---

## 1. Rel Test T0 工作流程

```
FX EPM 郵件通知 → 倉庫跑轉播單&領機(掃TT) → DQE 領機(須打印報告紙)
→ 通知外觀執行 T0 → Cosmetic 刷 Summary IN(IMES)
→ [目檢組測試前: 1.清潔機台 2.秤重] → 目檢 → 拍照
→ Cosmetic 刷 Summary OUT(IMES) → 外觀郵件通知 Mini line
→ Mini line 掃 Summary IN(IMES) → 工站測試 → Mini line Summary OUT + Report Summary IN
→ 照片複核 → 出 T0 報告 → 分 WF → 郵件告知 F1 等同意 → 入 Recon
→ 各 Function DRI 至報告組領機、打印報告紙 → 刷 Lab REL T0 Recon Tagging
→ (依 Test Plan 需求送 BCDC) → 目檢組補拍照(drop)/測色差(UV)
→ 刷 Test T0 failure mode Recon Tagging → 郵件通知投測試 → TX Start
```

關鍵節點時長（min）：倉庫領機 10 / 目檢前清潔秤重 30 / 目檢 15 / 拍照 45 / Mini line 12hr(工站) / 出報告 3hr / 分 WF 20 / 入 Recon 20 / 照片複核 1.5hr / BCDC 1 day。

## 2. Rel Test TX 工作流程

```
TX Start(各 Function DRI) → Test Center IMES/Summary IN → 刷 Test Recon Tagging
→ 測試組測試前 SYS Weight → TX CP1 Test Finish → 測試組測試後按 CP 需求 [1.SYS Weight 2.Hinge Torque 3.Button Tactility]
→ Test Center IMES/Summary OUT → 測試組郵件通知目檢
→ Cosmetic IMES/Summary IN → 目檢 → 拍照 → Cosmetic IMES/Summary OUT
→ 目檢郵件通知 Mini line → Mini line IMES/Summary IN → 工站測試 → Mini line Summary OUT + Report Summary IN
→ Mini line 郵件通知報告組 → 照片複核 → 出 TX 報告 → Report Summary OUT
→ Fail Item: F1 在 Recon 回覆 COF 或 FA → F1 Disposition
→ 入 Recon → FA 郵件通知測試組機台是否繼續投測試(Kevin) → 回到下一 CP 或進入 TF
```

## 3. Rel Test TF 工作流程

```
TX Last CP 完成 → 測試組測試前 SYS Weight → 測試後按 CP 需求量測
→ 刷 Recon TF Test Tagging / TF Lab Tagging → 郵件通知機台測試完成
→ Test Center IMES/Summary OUT → Cosmetic IMES/Summary IN → 目檢 → 拍照 → Summary OUT
→ Mini line Summary IN → 工站測試 → Summary OUT + Report Summary IN → 郵件通知已完成機台
→ 照片複核 → 出 TF 報告 → 入 Recon → F1 Disposition（Fail: COF/FA）→ Kevin 通知是否繼續
→ 郵件通知 TF 完成退庫 → 機台退庫
```

---

## 4. Report / Recon 工作流程

### 4.1 T0 報告流程

1. PM 匯總產品信息給 Report（含整合 EPM 組裝訊息）【T0 only】
2. PM 收到 FX PD&EPM OK2REL Tracker → 確認資訊一致 → 統整 Allocation Tracker【T0 only，30min】
3. Yoke/Bole 根據產品信息分配 WF（2min）→ WF 分配郵件發給 F1 Review，待 approve【New add P1】
4. 根據 WF 判斷是否需送 BCDC / 補拍照片 / 測色差；無其他需求則發投產 TX 郵件【New add P1】
5. 外觀將 Travel Sheet 送至 Recon 組 → Yoke 用「報告導入腳本」錄入外觀與工站 Failed（5min）
6. 按 F1 approve 的 WF 分配郵件和 Checkpoint 錄入
7. OPs 比對報告數據和 Recon 數據 → F1 電腦運行「報告和 Recon 對比腳本」（2min）
8. Bole 檢查報告數據與 Recon 數據是否一致（2min）→ 更新當天已完成報告機台的 Recon 日期
9. 檢查當日報告 Failure 數據是否有異常項（1min）
10. Bole 用「換行標藍加粗腳本」編輯報告 Log（1min）
11. Recon 組將 Travel Sheet 給報告組 → 報告紙分已錄完/未錄完專人管理
12. 從共享文件館下載 Mini line 報告（1min）→ 維護 SYS 資料至「報告導入腳本」（腳本內文檔名稱須與維護資料名稱一致）
13. 上傳報告至文件館和整機報告雷達備份（5min）

### 4.2 TX 報告流程

與 T0 基本相同，差異點：

- 維護的是**整機資料**（而非 SYS 資料）至報告導入腳本
- 增加：Bole 用 Email 發送報告給 F1（1min）
- 增加：運行「Recon VS RelReport 腳本」（5min）→ 第二天早上從 Dashboard 下載 Pass/Fail 數據並修改為一致（30min）
- 增加：FA 處理 Disposition 後通知投產（20hr 為 FA 處理時長）
- 增加：Miniline 發現 12-9（異常代碼）時立刻通知 Recon 輸入 Failure【New add P1】

### 4.3 腳本在此環節的作用

| 腳本 | 用途 |
|------|------|
| 報告導入腳本 | 錄入 SN / Test / CP / Failure Mode / Mini line Station Failed，減少人工疏漏 |
| 報告和 Recon 對比腳本 | OPs/F1 比對兩邊數據一致性 |
| Recon VS RelReport 腳本 | 次日比對 Dashboard Pass/Fail 與報告 |
| 換行標藍加粗腳本 | 格式化報告 Log 便於客戶閱讀 |
| Log 自動轉換 | 報告 log 頁 excel → csv 並自動上傳客戶指定雷達 |

---

## 5. Test Center 工作流程（T0 / TX）

1. Disposition 郵件通知接收機台
2. 接收機台（20min）→ 維護機台信息到測試記錄表（5min）
3. **Charging**：檢查電量 40%-70%（90min，P1 新增 SoC% 要求）
4. **導入 Rootloader**（20min，P1 新增）
5. 刷 IMES & Summary In（5min）→ 刷測試 T0/TX Recon（2min）
6. 檢查設備測試參數是否正確（5min）
7. 測試中：設備巡檢、記錄實時數據（設備增加超限報警）
8. 測試結束檢查機台是否有嚴重失效，記錄 Travel Sheet（30min）
9. **Hinge torque & Button Tactility Station**（20min，P1 CP 新增要求）
10. 收集複查測試和 Rootloader data 並上傳 radar（5min）
11. 打印報告紙、複查機台、記錄外觀問題（3min）→ 刷 IMES & Summary Out
12. 機台轉給 Cosmetic 並發郵件通知（20min）
13. 異常分支：機台異常無法繼續測試 → Recon 修改為 Dynamic 節點
14. 設備 Audit：Env 每月 / Mech 每周
15. 第二天 FA 發送 Disposition Summary 郵件 → Test Center 確認機台投入並回復（防漏投產機制）
16. FA/CT Return 郵件通知倉庫領取機台

---

## 6. Mini line 工作流程

### 6.1 Co-Work（與 xFN 合作分工）

| 工作項 | 負責方 |
|--------|--------|
| 測試環境準備、設備預算/請購/進口（Reimburse/Consign-HWTE&RF） | Jackson / Common-DQE |
| 工站架設、Calibration & GRR | Mini line + xFN |
| 工站日常 Audit | Mini line |
| 工站日常維護 | Mini line + xFN |

### 6.2 Station Testing（工站測試）

```
Cosmetic 將機台+Travel Sheet 放 <待掃進> 貨架 → Frank 掃 iMES & Summary IN
→ Charging → SWDL → SWDL-RF → Laser Scan(REL1) → Laser Scan(REL2)
→ 各 Stations（負責人見下表）→ OP 依報告紙判斷完成後放 <待出報告> 貨架
→ 掃 iMES & Summary OUT → 在 iMES 判定 T0 結果並通知 Rel-Report Team 進行 WF 分配
```

| Station | 負責人 |
|---------|--------|
| IMU / IMU Folded / IMU Function | Vincent / Jackson |
| System Test Folded | Vincent |
| Prox Test / LED Compliance / Prox Compliance Test | Jackson / Grant / Vincent |
| Camera Function（CCAM Gridflare、OFC CCAM Intrinsics、OFC Extrinsics Cal、OFC RACK） | FACT21 / Grant / Vader / Vincent |
| SRT / Cosmo | Jackson |
| Combo LED Cal/Test | Vincent |
| Isengard / Rigel Illegal Drive / Rigel Illegal Polling / Resolving Power Tester | Grant / Jackson |
| SWDL-RB / Log-Collection | Grant / Jackson |

### 6.3 Data & Report

1. Frank 確認每日報告截止點（中/夜班報告第二天早上匯總）
2. 數據組下載 SFC-bobcat 數據
3. **自動匯總報告腳本** 生成 Mini line Test Report 初版（pEVT 依 P1 經驗更新）
4. 將初版 Report 發給各 Function 確認數據
5. 匯總終版報告發送到 Rel-Report Team

---

## 7. Cosmetic 外觀目檢流程

### 7.1 T0

```
線尾倉領機至 WH → 郵件通知 Cosmetic 領機投產 → Cosmetic 至 WH 領機
→ 刷 IMES & Summary In → 清潔機台 → 機台稱重 → 填寫 Travel Sheet（打印腳本自動生成）
→ 各部位目檢（用目檢錄入腳本檢查重複項）→ 色差量測 → 維護 Travel Sheet
→ 4PT → 鏡片目檢（改善鏡片 crack 檢出 UPH）→ 機台放置待拍照區
```

### 7.2 TX

與 T0 差異：機台來源為 Test Center 待轉運區（等 Test Email 通知）；機台現場快檢；**CTL Drop 機台需檢查 EFI Diag**（用 Diags Check List）；其餘步驟相同。

---

## 8. Photo Station / 照片複核流程

### 8.1 Photo Station（Lucky）

手動站（Manual）：
```
接收機台刷 Summary In → 檢查相機參數 → 用治具匹配腳本確認治具正確
→ Photo station 拍正常照片 → 拍異常照片（拍不到的用 Keyence 拍，異常照片需在 Travel Sheet 打勾）
→ 用照片命名腳本命名 → 上傳共用指定資料夾 → 刷 Summary OUT
→ 郵件通知 Mini line 機台已放置貨架，Travel Sheet 給複核人員
```

自動站（Auto-Photo Station，PEVT 新增，改善拍照品質與 UPH）：
```
機台 transfer 到 Auto-Photo Station → OP 啟動設備上料 → 自動拍照命名
→ OP 拷貝照片給複核人員匯總
```

### 8.2 照片複核（Amy）

```
接收 Travel Sheet 刷 Summary In → 從共享文件館下載照片（用照片自動同步腳本）
→ 將照片移入照片複核腳本 → 按 Failure Mode 複核
→ 無異常：Travel Sheet 打勾簽名 → 複核完成照片用腳本傳送到 F1 硬盤
→ 有遺漏/不清晰：Summary 查機台位置 → 等 Mini line 完成 → 貨架取機補拍（30min 內完成）→ 補拍照片上傳共享
→ 連接 F1 硬盤與 BOX 電腦上傳照片到雷達（15min）→ 雙向對比腳本核對硬盤 Log 與 Report 信息
→ 刷 Summary Out 將 Travel Sheet 送報告 Recon 組
→ 次日用備份腳本將 F1 U 盤照片拷貝到 NAS（供目檢對比 & FA 使用）
```

---

## 9. FA / Disposition / FA Tracker 流程

### 9.1 FA Disposition（Fei / Mike/Yang / Lisa）

```
Fei: 登錄 radar 下載最新 System Report & FA tracker → Disposition SummaryInOut 刷 In
→ 登錄 Recon 查詢 FA 需求 → 更新機台信息至 FA tracker、創建 Radar
→ Radar 號更新至 Recon → 郵件通知 FA 部門 FA 需求並通知倉庫送機
→ Disposition 刷 Out 標記 FA，同時 FA summaryInOut 刷 In
→ 持續追蹤 push XF team FA 進度 → Disposition 刷 In 同時 FA 刷 Out
→ 發送投測郵件通知 Test Center 繼續測試 → Disposition 刷 Out 標記 TX

Mike/Yang（機台測試後段）：
Sys report 篩選最新測試記錄 → Recon 確認 → Recon 上傳 Stop test Tag
→ FA tracker 查詢其他 FA 需求 → 確認機台是否拆機 → 郵件通知 FA 並通知倉庫送機
→ Disposition 刷 Out 標記 FA + FA 刷 In → 追蹤進度（郵件/XXT push）
→ 根據回覆更新 Remark 與 FA status → 投測郵件通知 Test Center

Lisa: FA Return Units
Xiaoyue: 發送前一日總投產 List 郵件與 Test Center 確認（防漏投產）
```

### 9.2 FA Tracker 維護（Kevin / Lisa，每日 50min+）

1. 運行 Radar auto update 腳本
2. 下載最新 FA tracker、FA InOut、機台管理系統、New radar 文件
3. 更新 FA notes / Days since last update / Tear down(Y/N) / Shipping & RTV info / Unit location
4. 新增 FA ticket 匯總至 tracker，更新 Days since transfer
5. 運行 FA tracker 腳本更新 summary 頁 → 上傳雷達 157525665（5min）
6. 郵件告知 F1 生成 FA Dashboard

---

## 10. CT Lab 流程（xFN / CT Engineer / CT OP）

```
需求方在 CTMS 填寫 CT Scan 申請單 → CT 管理員指派任務並審核提單
→ [不合規: 拒簽並電話通知重填] / [合規: 分配測試設備 + 送樣郵件]
→ 需求方送樣（須過 TT 系統）→ CT Lab 簽收並確認掃描部位
→ 掃描準備（SOC 保護固定、參數設定、探測器校準）→ 開始掃描（CTMS 點「開始檢測」）
→ 掃描 60-120min → 取出樣品（CTMS 點「結束測試」）→ 模型重構及數據確認
→ CTMS 發取樣郵件 + 電話通知取回 → 需求方取回（過 TT）→ CTMS 點「關閉測試」結案
```

插隊機制：客戶插隊需 Approval → 需求方提供需求與 approval 給 CT PM（Kevin）。
每日 16:00 更新 CT Tracker 至 radar，同步 CTMS 最新狀態（30min）。

---

## 11. 腳本清單匯總（現狀：分散在多人電腦）

| # | 腳本 | 使用人 | 環節 |
|---|------|--------|------|
| 1 | 報告導入腳本 | Yoke/Bole | Report/Recon |
| 2 | 報告和 Recon 對比腳本 | F1/OPs | Report |
| 3 | Recon VS RelReport 腳本 | Bole | Report |
| 4 | 換行標藍加粗腳本 | Bole | Report |
| 5 | Log 頁 excel→csv 自動轉換上傳 | Yoke/Bole | Report |
| 6 | 自動匯總報告腳本 | Frank/數據組 | Mini line |
| 7 | 數據核對腳本 | Frank | Mini line |
| 8 | 刷 IMES & Summary 腳本 | Test Center | Test Center |
| 9 | 照片命名腳本 | Lucky | Photo Station |
| 10 | 治具匹配腳本 | Lucky | Photo Station |
| 11 | Auto-Photo Station 自動拍照命名 | Lucky | Photo Station |
| 12 | 照片自動同步腳本 | Amy | Photo Review |
| 13 | 照片複核腳本 | Amy | Photo Review |
| 14 | 備份腳本（F1 U盤→NAS） | Amy | Photo Review |
| 15 | 雙向對比腳本 | Amy | Photo Review |
| 16 | 目檢錄入查重腳本 | Tammy | Cosmetic |
| 17 | 打印腳本（自動生成 Travel Sheet） | Tammy | Cosmetic |
| 18 | Radar auto update 腳本 | Kevin/Lisa | FA |
| 19 | FA tracker 腳本 | Kevin/Lisa | FA |

---

## 12. 痛點分析（對應 Agent 設計）

### 痛點 1：文稿沒有電子化
- Travel Sheet 全程紙本傳遞：Cosmetic 填寫 → 拍照打勾 → Mini line → 照片複核簽名 → 送 Recon → 送報告組。每經一人抄錄一次。
- 測試記錄表、報告紙（已錄完/未錄完靠人工分架管理）均為紙本。
- **Agent 機會**：Travel Sheet 電子化為結構化數據（機台 SN、外觀 Failure、照片狀態、工站結果），一次錄入全程可見，自動生成各環節所需視圖。

### 痛點 2：一處修改、多處重改
- 同一機台狀態需同步：iMES(Summary In/Out)、Recon(客戶系統)、Radar(客戶系統)、FA Tracker、Dashboard、紙本 Travel Sheet，至少 6 處；其中 Recon/Radar 為客戶系統無 API，只能靠人登錄核對，加劇不一致。
- Pass/Fail 次日還要從 Dashboard 下來手動改一致（30min/天）。
- 補拍照片後：共享資料夾、複核腳本、F1 硬盤、雷達、NAS 五處同步。
- **Agent 機會**：以機台 SN 為主鍵的單一數據源（Single Source of Truth）建在公司側（掛接 iMES 事件）；Recon/Radar 側由 Agent 生成待回寫數據包 + 自動比對差異清單，人工/RPA 只執行最後一公里寫入。

### 痛點 3：腳本分散
- 19 個腳本分散在至少 10 個人的電腦，命名/維護靠口耳相傳；報告導入腳本內文檔名稱還須人工保持一致。
- **Agent 機會**：腳本統一註冊到 Agent（工具化），Agent 按流程自動調用；腳本版本、輸入輸出格式統一管理。

### 痛點 4（隱性）：郵件驅動的流程靠人盯
- 投產、Disposition、退庫、補拍全靠郵件通知，已有「Disposition Summary 郵件」「前一日總投產 List」等防漏機制，說明漏單已實際發生過。
- **Agent 機會**：Agent 監控狀態機，到點自動觸發通知與核對（如 T0 報告完成 20hr 未投 TX 自動提醒）。

### 痛點 5（系統邊界）：客戶系統（Recon/Radar）與公司系統（iMES）割裂
- iMES 的 Summary IN/OUT 事件與 Recon 的 Tagging/Failure 錄入是兩套賬，目前靠人「刷完這邊刷那邊」。
- **Agent 機會**：Agent 作為中間層（iMES/CTMS 事件 → 觸發 Recon/Radar 待辦清單），把「人記得要去刷」變成「系統告訴你該刷什麼」。
