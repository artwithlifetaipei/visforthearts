/**
 * 將資料庫或系統原始錯誤訊息（如 PostgreSQL constraint / Supabase 錯誤）
 * 轉換為使用者看得懂的白話繁體中文說明，明確告知「無法儲存的原因」與「解決方式」。
 */
export function formatFriendlyError(errOrMsg: any, fallbackAction = '儲存資料'): string {
  const raw =
    typeof errOrMsg === 'string'
      ? errOrMsg
      : errOrMsg?.message || errOrMsg?.error_description || errOrMsg?.details || '';

  const msg = String(raw || '').trim();
  if (!msg) {
    return `${fallbackAction}失敗：系統連線逾時或暫時無回應，請檢查網路連線後再試一次。`;
  }

  const lower = msg.toLowerCase();

  // 1. 品牌簡介 250 字限制 (exhibitor_applications_concept_brief_check)
  if (lower.includes('concept_brief_check') || lower.includes('concept_brief')) {
    return `${fallbackAction}失敗：「品牌參展核心概念簡述」字數超過系統單欄上限（250 字）。請精簡字數或重新點擊儲存，系統將自動為您分段完整存檔。`;
  }

  // 2. 展區代碼限制 (exhibitor_applications_zone_id_check / exhibitor_brands_zone_id_check)
  if (lower.includes('zone_id_check')) {
    return `${fallbackAction}失敗：所選的「參展展區」代碼不在系統允許範圍內，請重新選擇展區後再試。`;
  }

  // 3. 申請狀態限制 (exhibitor_applications_status_check)
  if (lower.includes('status_check')) {
    return `${fallbackAction}失敗：申請表狀態欄位格式不符系統規範，請重新整理頁面後再試。`;
  }

  // 4. Email 重複綁定 (exhibitor_brands_portal_email_key / unique constraint)
  if (lower.includes('portal_email_key') || (lower.includes('unique constraint') && lower.includes('email'))) {
    return `${fallbackAction}失敗：此電子信箱已經被其他參展品牌綁定使用，請更換另一個常用的 Email 信箱。`;
  }

  // 5. 合約重複簽署 (exhibitor_compliance_brand_id_key)
  if (lower.includes('exhibitor_compliance_brand_id_key')) {
    return `${fallbackAction}失敗：貴品牌已完成過參展規範備忘錄簽署，無需重複送出。`;
  }

  // 6. 必填欄位為空 (not-null constraint:23502)
  if (lower.includes('null value in column') || lower.includes('violates not-null constraint')) {
    if (lower.includes('brand_name_zh')) {
      return `${fallbackAction}失敗：「品牌中文名稱」為必填項目，請填寫後再儲存。`;
    }
    if (lower.includes('brand_name_en')) {
      return `${fallbackAction}失敗：「品牌英文名稱」為必填項目，請填寫後再儲存。`;
    }
    if (lower.includes('contact_name')) {
      return `${fallbackAction}失敗：「負責人／主要聯絡人姓名」為必填項目，請填寫後再儲存。`;
    }
    if (lower.includes('contact_email') || lower.includes('portal_email')) {
      return `${fallbackAction}失敗：「聯絡人電子信箱」為必填項目，請填寫後再儲存。`;
    }
    if (lower.includes('contact_phone')) {
      return `${fallbackAction}失敗：「聯絡人電話」為必填項目，請填寫後再儲存。`;
    }
    if (lower.includes('contact_address')) {
      return `${fallbackAction}失敗：「聯繫／通訊寄件地址」為必填項目，請填寫後再儲存。`;
    }
    if (lower.includes('title_zh')) {
      return `${fallbackAction}失敗：「作品／商品中文名稱」為必填項目，請填寫後再儲存。`;
    }
    return `${fallbackAction}失敗：尚有系統必填欄位未填寫完整，請檢查標示「*」之必填欄位後再試。`;
  }

  // 7. 品牌關聯識別失敗 (foreign key constraint: 23503)
  if (lower.includes('violates foreign key constraint') || lower.includes('23503')) {
    return `${fallbackAction}失敗：系統暫時無法對應貴品牌的後台帳號識別碼，請重新整理網頁（或重新登入）後再試一次。`;
  }

  // 8. 檔案過大或 Payload 超過上限 (413 / body exceeded / request entity too large)
  if (
    lower.includes('413') ||
    lower.includes('too large') ||
    lower.includes('exceeded') ||
    lower.includes('payload') ||
    lower.includes('body size')
  ) {
    return `${fallbackAction}失敗：您上傳的圖片或檔案容量過大（超過系統單次傳輸上限 12MB），請選擇較小的圖檔或截圖後重新上傳。`;
  }

  // 9. 權限或登入逾時 (JWT / RLS / row-level security / invalid login)
  if (
    lower.includes('row-level security') ||
    lower.includes('jwt expired') ||
    lower.includes('invalid token') ||
    lower.includes('permission denied')
  ) {
    return `${fallbackAction}失敗：您的後台登入時效已過期，請重新登入後台後再進行儲存。`;
  }

  // 10. 網路連線中斷或逾時 (Failed to fetch / AbortError / NetworkError)
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('aborted') ||
    lower.includes('timeout') ||
    lower.includes('load failed')
  ) {
    return `${fallbackAction}失敗：網路連線不穩定或傳輸逾時，請確認手機／電腦網路順暢後再按一次儲存。`;
  }

  // 若已經是中文說明，直接回傳
  if (/[\u4e00-\u9fa5]/.test(msg) && !lower.includes('violates') && !lower.includes('relation ')) {
    return msg;
  }

  return `${fallbackAction}失敗：系統偵測到資料格式不符合規範（原因：${msg}）。請檢查欄位內容後重試，或聯繫大會客服協助。`;
}
