import fetch from "node-fetch";

async function run() {
  try {
    const res = await fetch("http://localhost:3000/api/tasks");
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text.substring(0, 500));
  } catch (e) {
    console.error(e);
  }
}
run();
