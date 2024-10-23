const seq = String.raw`(?:\p{Emoji}\uFE0F\u20E3?|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation})`;

const sTags = String.raw`\u{E0061}-\u{E007A}`;

const emojiRegex = new RegExp(
  String.raw`[\u{1F1E6}-\u{1F1FF}]{2}|\u{1F3F4}[${sTags}]{2}[\u{E0030}-\u{E0039}${sTags}]{1,3}\u{E007F}|${seq}(?:\u200D${seq})*`,
  "gu",
);

export default emojiRegex;
