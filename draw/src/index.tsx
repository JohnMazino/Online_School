import { render } from "react-dom";
import App from "./App";

const rootElement = document.getElementById("root");

// Получаем userId из параметров URL или используем дефолтный
const params = new URLSearchParams(window.location.search);
const userIdParam = params.get('userId');
const userId = userIdParam ? parseInt(userIdParam) : 0;

render(<App userBoardId={userId || 0} />, rootElement);
