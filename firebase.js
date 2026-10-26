// 保存先（Firebase Firestore）への接続。アプリ本体(app.js)は、ここで作る window.getDb() を通して保存・読み込みをします。
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, onSnapshot, setDoc, deleteDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./config.js";

let db = null;
try {
  if (!firebaseConfig.projectId || firebaseConfig.projectId.indexOf("YOUR_") === 0) throw new Error("config.js が未設定です");
  const app = initializeApp(firebaseConfig);
  let fs;
  try {
    // 電波が悪い時の書き込みを端末に残して、あとで自動送信する
    fs = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  } catch (e) {
    fs = getFirestore(app);
  }
  db = {
    collection(name) {
      return {
        onSnapshot(cb, err) {
          return onSnapshot(
            collection(fs, name),
                        { includeMetadataChanges: true }
            (snap) => cb({ fromCache: snap.metadata.fromCache, docs: snap.docs.map((d) => ({ id: d.id, data: () => d.data() })) }),
            err
          );
        }
      };
    },
    doc(path) {
      const ref = doc(fs, path);
      return {
        set: (data) => setDoc(ref, data),
        delete: () => deleteDoc(ref),
        get: async () => { const s = await getDoc(ref); return { exists: s.exists(), data: () => s.data() }; }
      };
    }
  };
} catch (e) {
  console.error(e);
}
window.getDb = () => Promise.resolve(db);

const s = document.createElement("script");
s.src = "./app.js";
document.body.appendChild(s);
