import OpenCC from "opencc-js";

export type LocaleId = "cn" | "tw" | "hk" | "jp" | "sg" | "my";
export type RegionalForms = Record<LocaleId, string>;

const simplifiedToTraditional = OpenCC.Converter({ from: "cn", to: "t" });
const japaneseToTraditional = OpenCC.Converter({ from: "jp", to: "t" });
const traditionalToSimplified = OpenCC.Converter({ from: "t", to: "cn" });
const traditionalToTaiwan = OpenCC.Converter({ from: "t", to: "tw" });
const traditionalToHongKong = OpenCC.Converter({ from: "t", to: "hk" });
const traditionalToJapanese = OpenCC.Converter({ from: "t", to: "jp" });

export function convertRegionalForms(input: string): RegionalForms {
  const traditional = japaneseToTraditional(simplifiedToTraditional(input));
  const simplified = traditionalToSimplified(traditional);

  return {
    cn: simplified,
    tw: traditionalToTaiwan(traditional),
    hk: traditionalToHongKong(traditional),
    jp: traditionalToJapanese(traditional),
    sg: simplified,
    my: simplified,
  };
}
