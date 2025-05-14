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
    const slugify = (str) => str.normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "") // 移除變音符號
        .replace(/[^\w\s-]/g, "")        // 移除特殊符號
        .trim()
        .replace(/\s+/g, "-")            // 空白變 -
        .toLowerCase();

    const fileName = `${slugify(book.name)}-${Date.now()}.pdf`;

    // 將 Base64 資料轉換為 Uint8Array
    const base64Data = book.data.split(",")[1]; // 移除 "data:application/pdf;base64,"
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const file = new File([binaryData], fileName, { type: "application/pdf" });

    // 上傳至 Storage bucket
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
    // 1. 取得書籍資訊
    const { data: books, error: fetchError } = await supabase
      .from("books")
      .select("*")
      .eq("user_id", user_id)
      .eq("name", bookName);

    if (fetchError || !books.length) {
      console.error("找不到該書籍或發生錯誤:", fetchError?.message);
      return;
    }

    // 2. 刪除 Storage 中的檔案
    const bookId = books[0].id;
    const path = books[0].file_url.split('/storage/v1/object/public/books/')[1];

    const { error: storageError } = await supabase
      .storage
      .from("books")
      .remove([path]);

    if (storageError) {
      console.error("Storage 刪除失敗:", storageError.message);
    }
      // 3. 刪除 `reading_progress` 中的對應進度
    const { error: progressDeleteError } = await supabase
      .from("reading_progress")
      .delete()
      .eq("user_id", user_id)
      .eq("book_id", bookId);

    if (progressDeleteError) {
      console.error("刪除閱讀進度失敗:", progressDeleteError.message);
    } 


    // 4. 刪除 `books` 資料表中的書籍紀錄
    const { error: deleteError } = await supabase
      .from("books")
      .delete()
      .eq("user_id", user_id)
      .eq("name", bookName);

    if (deleteError) {
      console.error("資料表刪除書籍失敗:", deleteError.message);
    } else{
      console.log(`📕 書籍 ${bookName} 以及相關進度紀錄已成功刪除`);
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
    const { data: books, error: fetchError } = await supabase
      .from("books")
      .select("*")
      .eq("user_id", user_id)
      .eq("name", bookName);

    if (fetchError || !books.length) {
      console.error("找不到該書籍或發生錯誤:", fetchError?.message);
      return null;
    }

    const fileUrl = books[0].file_url;

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

// 儲存進度
export const saveReadingProgress = async (userId, bookId, pageNumber) => {
  try {
    // console.log("儲存進度:", { userId, bookId, pageNumber });
    
    // 檢查是否已有進度紀錄
    const { data: existingRecord, error: selectError } = await supabase
      .from("reading_progress")
      .select("id")
      .eq("user_id", userId)
      .eq("book_id", bookId)
      .single();

    if (selectError && selectError.code !== "PGRST116") {
      // PGRST116 = No rows found (這是正常情況)
      throw new Error("檢查進度失敗");
    }

    if (existingRecord) {
      // 更新現有的進度
      const { error: updateError } = await supabase
        .from("reading_progress")
        .update({ page_number: pageNumber })
        .eq("user_id", userId)
        .eq("book_id", bookId);

      if (updateError) {
        throw new Error("更新進度失敗");
      }

      console.log("進度已更新");
    } else {
      // 插入新的進度
      const { error: insertError } = await supabase
        .from("reading_progress")
        .insert({ user_id: userId, book_id: bookId, page_number: pageNumber });

      if (insertError) {
        throw new Error("插入進度失敗");
      }

      console.log("進度已儲存");
    }
  } catch (error) {
    console.error("儲存進度失敗:", error.message);
  }
};


export const getLastPage = async (bookId, userId) => {
        try {
            // 從 Supabase 取得進度
            const { data, error } = await supabase
                .from("reading_progress")
                .select("page_number")
                .eq("user_id", userId)
                .eq("book_id", bookId)
                .single();

            if (error && error.code !== "PGRST116") {
                console.error("無法取得進度:", error.message);
                return 0;
            }

            // 如果 Supabase 有進度紀錄
            if (data) return data.page_number;

            // 如果 Supabase 沒有紀錄，從 localStorage 讀取
            const bookmark = localStorage.getItem(`bookmark-${bookId}`);
            return bookmark ? parseInt(bookmark) : 0;
        } catch (err) {
            console.error("讀取進度錯誤:", err);
            return 0;
        }
    };