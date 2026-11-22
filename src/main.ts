import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/controls.css';
import { startApp } from './app';

startApp(document.getElementById('app')!).catch((err) => {
  console.error(err);
  document.getElementById('app')!.textContent = 'Không khởi động được toolkit. Hãy tải lại trang.';
});
