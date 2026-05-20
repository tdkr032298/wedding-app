"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [guestName, setGuestName] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("message")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setMessages(data);
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const saveMessage = async () => {
    const { error } = await supabase.from("message").insert([
      {
        guest_name: guestName,
        message: message,
      },
    ]);
    if (error) {
      alert(`保存失敗: ${error.message}`);
      console.error("Supabase error:", error);
      return;
    }

    alert("保存成功！");
    setGuestName("");
    setMessage("");

    fetchMessages();
  };

  return (
    <main className="p-10 flex flex-col gap-4 max-w-md">
      <h1 className="text-3xl font-bold">Wedding App</h1>

      <input
        className="border p-2"
        placeholder="名前"
        value={guestName}
        onChange={(e) => setGuestName(e.target.value)}
      />

      <textarea
        className="border p-2"
        placeholder="メッセージ"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <button
        className="bg-pink-500 text-white p-2 rounded"
        onClick={saveMessage}
      >
        送信
      </button>

      <div className="mt-10">
        <h2 className="text-2xl font-bold mb-4">ゲスト一覧</h2>

        <div className="flex flex-col gap-2">
          {messages.map((item) => (
            <div key={item.id} className="border p-3 rounded">
              <p className="font-bold">{item.guest_name}</p>

              <p>{item.message}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
