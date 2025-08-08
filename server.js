import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const saveFile = path.join(__dirname, "saves", "map.json");

// Убедиться, что директория "saves" существует
const savesDir = path.join(__dirname, "saves");
if (!fs.existsSync(savesDir)) {
  fs.mkdirSync(savesDir);
}

app.use(express.json());
app.use(express.static("public"));

app.get("/map", (req, res) => {
  if (!fs.existsSync(saveFile)) {
    const defaultMap = Array.from({ length: 20 }, () =>
      Array.from({ length: 20 }, () => 0)
    );
    fs.writeFileSync(saveFile, JSON.stringify(defaultMap));
  }
  res.json(JSON.parse(fs.readFileSync(saveFile)));
});

app.post("/map", (req, res) => {
  fs.writeFileSync(saveFile, JSON.stringify(req.body));
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});
