import { supabase } from '../supabase';

// 從 Supabase 取得書籍
export const getBooksFromSupabase = async (user_id) => {
  console.time("getBooksFromSupabase");

  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", user_id);

  if (error) {
    console.error("Supabase 取得書籍失敗:", error.message);
    console.timeEnd("getBooksFromSupabase");
    return [];
  }

  console.timeEnd("getBooksFromSupabase");
  console.log("Supabase 取得書籍成功:", data);
  return data;
};

// 儲存書籍至 Supabase Storage 並在資料表記錄
export const uploadToSupabase = async (book, user_id) => {
  console.time("uploadToSupabase");

  try {
    // 產生唯一檔名
    // 產生安全的檔案名稱
    const slugify = (str) => str.normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "") // 移除變音符號
        .replace(/[^\w\s-]/g, "")        // 移除特殊符號
        .trim()
        .replace(/\s+/g, "-")            // 空白變 -
        .toLowerCase();

    const fileName = `${slugify(book.name)}-${Date.now()}.pdf`; // 改成 .pdf

    // 將 Base64 資料轉換為 Uint8Array
    const base64Data = book.data.split(",")[1]; // 移除 "data:application/pdf;base64,"
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));


    const file = new File([binaryData], fileName, { type: "application/pdf" });


    // 上傳至 Storage bucket（books/user_id/file.pdf）
    const { error: storageError } = await supabase
      .storage
      .from("books")
      .upload(`${user_id}/${book.id}.pdf`, file, { upsert: true });

    if (storageError) {
      console.error("Storage 上傳失敗:", storageError.message);
      return;
    }

    
    // 取得公開 URL
    const { data: urlData } = supabase
      .storage
      .from("books")
      .getPublicUrl(`${user_id}/${book.id}.pdf`);

    const fileUrl = urlData.publicUrl;

    // 將 metadata 存進資料表
    const { error: insertError } = await supabase.from("books").insert([{
      id: book.id,
      name: book.name,
      user_id,
      file_url: fileUrl,
    }]);

    if (insertError) {
      console.error("Supabase 上傳書籍 metadata 失敗:", insertError.message);
    } else {
      console.log(`✅ 書籍 ${book.name} 上傳成功`);
    }
    
    return fileUrl;

  } catch (err) {
    console.error("❌ 上傳過程發生錯誤:", err);
  }

  console.timeEnd("uploadToSupabase");
};

// 刪除書籍（Storage + Metadata）
export const deleteFromSupabase = async (bookName, user_id) => {
  console.time("deleteFromSupabase");

  try {
    // 先查詢該書籍紀錄
    const { data: books, error: fetchError } = await supabase
      .from("books")
      .select("*")
      .eq("user_id", user_id)
      .eq("name", bookName);

    if (fetchError || !books.length) {
      console.error("找不到該書籍或發生錯誤:", fetchError?.message);
      return;
    }

    const path = books[0].file_url.split('/storage/v1/object/public/books/')[1];

    // 刪除 Storage 檔案
    const { error: storageError } = await supabase
      .storage
      .from("books")
      .remove([path]);

    if (storageError) {
      console.error("Storage 刪除失敗:", storageError.message);
    }

    // 刪除 metadata
    const { error: deleteError } = await supabase
      .from("books")
      .delete()
      .eq("user_id", user_id)
      .eq("name", bookName);

    if (deleteError) {
      console.error("資料表刪除書籍失敗:", deleteError.message);
    } else {
      console.log(`📕 書籍 ${bookName} 刪除成功`);
    }

  } catch (err) {
    console.error("❌ 刪除過程錯誤:", err);
  }

  console.timeEnd("deleteFromSupabase");
};

// 查看單一書籍內容（來自 Storage）
export const viewBookContent = async (bookName, user_id) => {
  console.time("viewBookContent");

  try {
    // 先查詢該書籍紀錄
    const { data: books, error: fetchError } = await supabase
      .from("books")
      .select("*")
      .eq("user_id", user_id)
      .eq("name", bookName);

    if (fetchError || !books.length) {
      console.error("找不到該書籍或發生錯誤:", fetchError?.message);
      return null;
    }

    // 取得檔案 URL
    const fileUrl = books[0].file_url;

    // 下載檔案內容（假設是 text 檔）
    const response = await fetch(fileUrl);
    const textContent = await response.text();

    console.timeEnd("viewBookContent");
    return textContent;

  } catch (err) {
    console.error("❌ 讀取書籍內容錯誤:", err);
    console.timeEnd("viewBookContent");
    return null;
  }
};
