import OpenCC from "opencc-js";
export type LocaleId = "cn" | "tw" | "hk" | "jp" | "sg" | "my";
export type SourceLocale = "cn" | "t" | "jp";
export type RegionalForms = Record<LocaleId, string>;
const toTraditional = {
  cn: OpenCC.Converter({ from: "cn", to: "t" }),
  t: (input: string) => input,
  jp: OpenCC.Converter({ from: "jp", to: "t" }),
};
const converters = {
  cn: OpenCC.Converter({ from: "t", to: "cn" }),
  tw: OpenCC.Converter({ from: "t", to: "tw" }),
  hk: OpenCC.Converter({ from: "t", to: "hk" }),
  jp: OpenCC.Converter({ from: "t", to: "jp" }),
};
export function convertRegionalForms(
  input: string,
  source: SourceLocale = "cn",
): RegionalForms {
  const traditional = toTraditional[source](input);
  const cn = converters.cn(traditional);
  return {
    cn,
    tw: converters.tw(traditional),
    hk: converters.hk(traditional),
    jp: converters.jp(traditional),
    sg: cn,
    my: cn,
  };
}
