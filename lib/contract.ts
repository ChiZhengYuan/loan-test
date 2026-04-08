import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { ContractSnapshot } from "./types";

type ContractClause = {
  title: string;
  paragraphs: string[];
};

const clauseList: ContractClause[] = [
  {
    title: "一、契約雙方",
    paragraphs: [
      "甲方為車輛所有人（委託人）；乙方為受託代租方（受託人）。雙方同意依本契約及其附件、線上簽署內容與封存紀錄履行權利義務。"
    ]
  },
  {
    title: "二、委託車輛資料",
    paragraphs: [
      "本契約所稱委託車輛之車牌號碼、車型、顏色及出廠年份，均以系統建立案件時所載之車輛快照為準，並構成契約不可分之一部分。",
      "乙方確認於簽署前已依實際狀況查驗車輛外觀、配備、里程、機械狀態與必要證明文件，並同意按現況委託。"
    ]
  },
  {
    title: "三、委託期間",
    paragraphs: [
      "委託期間以案件所載起始時間至結束時間為準，乙方應於期間屆滿前完成車輛交接、還原或其他甲方指定之處理事項。",
      "未經甲方書面同意，乙方不得提前延長、擅自續用或變更歸還方式。"
    ]
  },
  {
    title: "四、委託用途限制",
    paragraphs: [
      "乙方僅得基於合法、正當且與案件目的相符之用途處理車輛，不得超出甲方同意之範圍。",
      "乙方不得使用車輛從事競速、測試、教練、營業載運、載運違禁物、報酬性租賃、犯罪行為或其他足以損害甲方權益之用途。"
    ]
  },
  {
    title: "五、禁止轉借、轉租、交由第三人駕駛",
    paragraphs: [
      "乙方不得將車輛轉借、轉租、出借他人、設定擔保、拆解、改裝或交由未經甲方明示同意之第三人駕駛或控制。",
      "乙方違反前項規定者，視為重大違約，甲方得立即終止契約並請求損害賠償。"
    ]
  },
  {
    title: "六、禁止非法用途",
    paragraphs: [
      "乙方不得將車輛用於違法行為、逃避執法、妨害交通安全、運輸非法物品或其他違反法令、公序良俗之目的。",
      "如因乙方使用車輛涉及刑事、行政或民事責任，概由乙方自行負責，並應使甲方免受損害。"
    ]
  },
  {
    title: "七、禁止酒駕、毒駕、危險駕駛",
    paragraphs: [
      "乙方不得於飲酒、施用毒品、藥物或其他足以影響判斷與駕駛能力之情形下駕駛車輛。",
      "乙方不得超速、危險駕駛、闖紅燈、逆向、競速或有其他足以危及人車安全之行為。"
    ]
  },
  {
    title: "八、費用負擔",
    paragraphs: [
      "委託期間內因招租、交車、試駕、轉交、保管、移置或其他受託事項所產生之交通罰單、停車費、過路費、ETC 費用、拖吊費、保管費及其他相關行政費用，均由責任歸屬方負擔。",
      "如上開費用先由甲方代墊，乙方應於甲方通知後立即返還，並負擔因此生之必要費用。"
    ]
  },
  {
    title: "九、事故責任",
    paragraphs: [
      "委託期間如發生碰撞、翻覆、火災、泡水、竊盜、零件損壞、人員傷亡或其他事故，乙方應立即通知甲方並依法處理。",
      "如事故係因乙方之故意、過失、違法駕駛或違反本契約所致，乙方應負全部賠償責任。"
    ]
  },
  {
    title: "十、保險不足部分由乙方負擔",
    paragraphs: [
      "車輛如有投保強制汽車責任保險或任意險，其理賠範圍及額度仍不足以完全涵蓋損害者，不足部分由乙方負擔。",
      "保險公司不理賠、拒賠、減賠或有免責事由者，仍不影響乙方依本契約應負之全部責任。"
    ]
  },
  {
    title: "十一、車損修復責任",
    paragraphs: [
      "車輛如有刮傷、凹陷、零件損壞、內裝破損、異味、清潔費用或其他影響使用與價值之損害，乙方應依甲方指定之原廠或經甲方同意之廠商修復。",
      "如無法修復或修復後價值仍有減損，乙方應按甲方實際損失賠償。"
    ]
  },
  {
    title: "十二、失竊、遺失責任",
    paragraphs: [
      "如車輛、鑰匙、文件、配件、證件或隨車設備有失竊、遺失、遭扣押或無法返還之情形，除不可歸責於乙方之事由外，乙方應負賠償責任。",
      "乙方並應配合甲方辦理報案、保險、追償與相關行政作業。"
    ]
  },
  {
    title: "十三、逾期未還違約責任",
    paragraphs: [
      "乙方未依約完成交接、返還或處理事項者，視為逾期未還，並應立即通知甲方並依甲方指示處理。",
      "如有逾期未還、遲延交付或因此衍生之損害，乙方應負相關違約責任與損害賠償責任；甲方得依實際損失、必要費用及其他可請求項目另行主張權利。"
    ]
  },
  {
    title: "十四、甲方提前終止權",
    paragraphs: [
      "如乙方有違約、違法、風險升高、聯繫中斷、車輛保全疑慮或其他足認甲方權益受有損害之情形，甲方得隨時提前終止本契約。",
      "甲方依前項終止時，乙方應立即返還車輛，不得拒絕、拖延或附加條件。"
    ]
  },
  {
    title: "十五、電子簽署與證據效力",
    paragraphs: [
      "雙方同意以電子方式簽署本委託書，並同意電子簽名、一次性驗證、連線來源、定位資訊、操作紀錄、時間戳記、檔案雜湊與系統封存紀錄，均得作為本契約成立、履行及爭議處理之證據。",
      "乙方確認於簽署時具有完全行為能力，且親自完成簽署與驗證程序，對於系統留存之資料內容不爭執其真實性。"
    ]
  },
  {
    title: "十六、個資蒐集、處理、利用告知",
    paragraphs: [
      "雙方同意其提供之姓名、身分證字號、聯絡方式、地址、照片、文件、簽名圖、連線來源、定位資料、一次性驗證碼及相關操作紀錄，僅供本契約管理、驗證、履約、爭議處理、證據保存及法令遵循之目的蒐集、處理與利用。",
      "相關個資將依法律及系統保存政策封存，並於必要期間內供甲方、受託處理單位、司法機關或依法有權調取之機關使用。"
    ]
  },
  {
    title: "十七、爭議處理與管轄法院",
    paragraphs: [
      "本契約如有爭議，雙方應先本於誠信協商；協商不成時，雙方同意以案件所載管轄法院為第一審專屬管轄法院。",
      "若管轄法院約定與強行法規牴觸，則以法律允許之最接近約定效果為準。"
    ]
  },
  {
    title: "十八、補充約定",
    paragraphs: [
      "本契約未盡事宜，依中華民國相關法令、交易習慣及誠信原則處理。",
      "本契約以系統封存之最終版本為準；如需修改條款，應重新建立案件並重新完成簽署程序。",
    ]
  }
];

export function buildContractSnapshotTitle(contractNo: string) {
  return `車主委託放租契約（${contractNo}）`;
}

export function buildContractSections(snapshot: ContractSnapshot) {
  const scheduleText = `${format(new Date(snapshot.schedule.borrowStartAt), "yyyy/MM/dd HH:mm", { locale: zhTW })} 至 ${format(new Date(snapshot.schedule.borrowEndAt), "yyyy/MM/dd HH:mm", { locale: zhTW })}`;

  return [
    {
      title: "契約摘要",
      paragraphs: [
        `本件契約以車牌 ${snapshot.vehicle.plate}、車型 ${snapshot.vehicle.model}、顏色 ${snapshot.vehicle.color}、出廠年份 ${snapshot.vehicle.year} 為標的。`,
        `委託期間為 ${scheduleText}。`,
        `逾期未還責任依本契約、實際損害與必要費用處理。`,
        `管轄法院約定為 ${snapshot.terms.courtJurisdiction}。`,
        snapshot.terms.specialTerms ? `特殊約定：${snapshot.terms.specialTerms}` : "本案件未另行記載特殊約定。"
      ]
    },
    ...clauseList,
    {
      title: "契約雙方資料",
      paragraphs: [
        `甲方（車輛所有人／委託人）：${snapshot.lender.name}，身分證字號 ${snapshot.lender.id}，聯絡電話 ${snapshot.lender.phone}。`,
        "乙方（受託代租方／使用人）：蔡正源，聯絡電話 0963025420。",
      ]
    },
    {
      title: "委託車輛資料",
      paragraphs: [
        `車牌號碼：${snapshot.vehicle.plate}`,
        `車型：${snapshot.vehicle.model}`,
        `顏色：${snapshot.vehicle.color}`,
        `出廠年份：${snapshot.vehicle.year}`
      ]
    },
    {
      title: "委託期間與違約責任",
      paragraphs: [
        `起始時間：${format(new Date(snapshot.schedule.borrowStartAt), "yyyy/MM/dd HH:mm", { locale: zhTW })}`,
        `結束時間：${format(new Date(snapshot.schedule.borrowEndAt), "yyyy/MM/dd HH:mm", { locale: zhTW })}`,
        "逾期未還責任：依本契約、實際損害與必要費用處理"
      ]
    }
  ];
}

export function buildLegalDocumentText(snapshot: ContractSnapshot, contractNo: string) {
  const sections = buildContractSections(snapshot);
  return {
    title: buildContractSnapshotTitle(contractNo),
    contractNo,
    specialTerms: snapshot.terms.specialTerms,
    courtJurisdiction: snapshot.terms.courtJurisdiction,
    sections
  };
}








