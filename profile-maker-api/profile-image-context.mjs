const CONTACT_LABEL_PATTERN = /(?:상담사\s*)?(?:고유\s*번호|상담\s*번호|전화\s*번호|연락처|대표\s*번호)\s*[:：#-]?\s*(?:[A-Za-z0-9_-]{2,})?/gi;
const LOCAL_PHONE_PATTERN = /(?:\+?82[-.\s]?)?(?:\(0\d{1,2}\)|0\d{1,2})[-.\s]*\d{3,4}[-.\s]*\d{4}/g;
const REPRESENTATIVE_PHONE_PATTERN = /\b1[5-8]\d{2}[-.\s]*\d{4}\b/g;
const COMPACT_PHONE_PATTERN = /\b0\d{9,10}\b/g;
const CONTACT_LIKE_NUMBER_PATTERN = /\b(?:\d[\s,().-]*){7,12}\b/g;

export function sanitizeImagePromptContext(value, maxLength = 500) {
    return String(value || '')
        .replace(/&lt;\/?[A-Za-z][\s\S]{0,1000}?&gt;/gi, ' ')
        .replace(/<\/?[A-Za-z][^>]{0,1000}>/g, ' ')
        .replace(CONTACT_LABEL_PATTERN, ' ')
        .replace(LOCAL_PHONE_PATTERN, ' ')
        .replace(REPRESENTATIVE_PHONE_PATTERN, ' ')
        .replace(COMPACT_PHONE_PATTERN, ' ')
        .replace(CONTACT_LIKE_NUMBER_PATTERN, ' ')
        .replace(/연결\s*후\s*\d+\s*번(?:을)?\s*(?:입력|선택)?/g, ' ')
        .replace(/번호를\s*(?:입력|선택)/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, Math.max(Number(maxLength) || 0, 0));
}
