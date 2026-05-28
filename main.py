import sys
import random
import os
from datetime import datetime
from PyQt6.QtWidgets import QApplication, QLabel, QWidget, QVBoxLayout, QMenu
from PyQt6.QtGui import QPixmap, QCursor, QAction
from PyQt6.QtCore import Qt, QTimer, QPoint

class ChancanPet(QWidget):
    def __init__(self):
        super().__init__()
        
        # --- 視窗基礎設定 (完美的透明無邊框) ---
        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint | 
            Qt.WindowType.WindowStaysOnTopHint | 
            Qt.WindowType.Tool
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        
        # --- 狀態與設定 ---
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.states = {
            "LAUGH": {"img": "assets/LAUGH.png", "msg": ["親愛的母，看到我笑，心情有沒有好一點呀？❤️", "親愛的母，今天也要開開心心喔！"]},
            "TRAVEL": {"img": "assets/TRAVEL.png", "msg": ["親愛的母！喝口水休息一下吧！", "不管有多忙，璨璨永遠在旁邊陪妳喔！"]},
            "SLEEP": {"img": "assets/SLEEP.png", "msg": []},
            "STRETCH": {"img": "assets/STRETCH.png", "msg": ["哇～被抓起來了！", "親愛的母，站起來伸個懶腰吧！"]}
        }
        self.current_state = "LAUGH"
        
        # --- UI 佈局 ---
        self.layout = QVBoxLayout()
        self.layout.setContentsMargins(0, 0, 0, 0)
        
        # 對話框 (預設隱藏)
        self.msg_label = QLabel("")
        self.msg_label.setStyleSheet("""
            background-color: #fffae6; 
            border: 2px solid #ffcc00; 
            border-radius: 10px; 
            padding: 8px; 
            font-family: '微軟正黑體'; 
            font-weight: bold; 
            font-size: 14px;
        """)
        self.msg_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.msg_label.hide()
        
        # 圖片標籤
        self.image_label = QLabel()
        self.image_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        
        self.layout.addWidget(self.msg_label, alignment=Qt.AlignmentFlag.AlignBottom | Qt.AlignmentFlag.AlignHCenter)
        self.layout.addWidget(self.image_label)
        self.setLayout(self.layout)
        
        # 載入初始圖片
        self.update_image()
        
        # --- 拖曳用變數 ---
        self.dragging = False
        self.offset = QPoint()
        
        # --- 設定初始位置 (螢幕右下角) ---
        screen = QApplication.primaryScreen().geometry()
        self.move(screen.width() - 300, screen.height() - 350)
        
        # --- 啟動計時器 ---
        self.time_timer = QTimer(self)
        self.time_timer.timeout.connect(self.check_time)
        self.time_timer.start(60000) # 每分鐘檢查一次
        
        self.msg_timer = QTimer(self)
        self.msg_timer.timeout.connect(self.hide_message)
        
        self.cheer_timer = QTimer(self)
        self.cheer_timer.timeout.connect(self.random_cheer)
        self.schedule_next_cheer()

    def update_image(self):
        img_path = os.path.join(self.base_dir, self.states[self.current_state]["img"])
        pixmap = QPixmap(img_path)
        if not pixmap.isNull():
            # 縮放圖片並保持比例，開啟平滑轉換抗鋸齒
            pixmap = pixmap.scaled(200, 200, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation)
            self.image_label.setPixmap(pixmap)
            self.resize(self.layout.sizeHint())
        else:
            print(f"找不到圖片: {img_path}")

    def show_message(self, text, duration=5000):
        self.msg_label.setText(text)
        self.msg_label.show()
        self.msg_timer.start(duration)
        self.resize(self.layout.sizeHint())

    def hide_message(self):
        self.msg_label.hide()
        self.msg_timer.stop()

    def check_time(self):
        now = datetime.now()
        if (now.hour == 11 and now.minute >= 30) or (now.hour == 12):
            self.change_state("SLEEP")
            self.show_message("親愛的母，現在是午休時間！一定要記得吃午餐喔！", 15000)
        elif 15 <= now.hour < 17:
            self.change_state("SLEEP")
            self.show_message("親愛的母，下午 3 點多了，可以準備收工囉！", 15000)
        else:
            if self.current_state == "SLEEP":
                self.change_state("LAUGH")

    def schedule_next_cheer(self):
        next_time = random.randint(45 * 60 * 1000, 60 * 60 * 1000)
        self.cheer_timer.start(next_time)

    def random_cheer(self):
        if self.current_state not in ["SLEEP", "STRETCH"]:
            self.change_state("TRAVEL")
            msg = random.choice(self.states["TRAVEL"]["msg"])
            self.show_message(msg, 8000)
            QTimer.singleShot(8000, lambda: self.change_state("LAUGH"))
        self.schedule_next_cheer()

    def change_state(self, new_state):
        if self.current_state != new_state:
            self.current_state = new_state
            self.update_image()

    # --- 滑鼠事件 (重寫) ---
    def mousePressEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.dragging = True
            self.offset = event.globalPosition().toPoint() - self.pos()
            self.change_state("STRETCH")
            self.show_message(self.states["STRETCH"]["msg"][0], 2000)
            
        elif event.button() == Qt.MouseButton.RightButton:
            self.show_menu(event.globalPosition().toPoint())

    def mouseMoveEvent(self, event):
        if self.dragging:
            self.move(event.globalPosition().toPoint() - self.offset)

    def mouseReleaseEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.dragging = False
            self.check_time() # 放開後根據時間決定變回大笑還是睡覺

    def show_menu(self, pos):
        menu = QMenu(self)
        quit_action = QAction("親愛的母，我要先去休息囉 (關閉)", self)
        quit_action.triggered.connect(QApplication.instance().quit)
        menu.addAction(quit_action)
        menu.exec(pos)

if __name__ == "__main__":
    app = QApplication(sys.argv)
    pet = ChancanPet()
    pet.show()
    sys.exit(app.exec())