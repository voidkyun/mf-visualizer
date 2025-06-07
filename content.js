// デバッグ用の設定
const DEBUG = false; // デバッグモードの切り替え
const DEBUG_DATE = '2025-05-02'; // デバッグ用の日付
const DEBUG_START_TIME = '16:50'; // デバッグ用の開始時刻

// グローバル変数
let shukkinTime = null;
let breakTimes = [];
let pageLoadTime = null; // ページ読み込み時刻
let scheduledWorkHours = localStorage.getItem('scheduledWorkHours') ? parseFloat(localStorage.getItem('scheduledWorkHours')) : 8; // デフォルトの予定労働時間（時間）

// 今日の日付を取得（yyyy年mm月dd日(w)形式）
const today = DEBUG ? new Date(DEBUG_DATE) : new Date();
const year = today.getFullYear();
const month = today.getMonth() + 1;
const date = today.getDate();
const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
const weekday = weekdays[today.getDay()];
const todayString = `${year}年${month}月${date}日(${weekday})`;
console.log('検索対象の日付:', todayString);

// 要素の監視と処理を行う関数
function processElements() {
  // すでにメーターUIが存在していれば何もしない
  if (document.querySelector('.work-time-meter-container')) {
    return;
  }

  const h3Elements = document.querySelectorAll('h3[data-v-16531082]');
  console.log('h3要素の総数:', h3Elements.length);

  if (h3Elements.length === 0) {
    console.log('警告: h3要素が1つも見つかりません。');
    return;
  }

  h3Elements.forEach((h3, index) => {
    const h3Text = h3.textContent.trim();
    console.log(`h3要素 ${index + 1}:`, h3Text);
    console.log(`h3要素 ${index + 1}のクラス:`, h3.className);
    console.log(`h3要素 ${index + 1}の属性:`, h3.attributes);
  });

  const todayH3 = Array.from(h3Elements).find(h3 => h3.textContent.trim() === todayString);

  if (todayH3) {
    // 親要素のhistory-list-groupを取得
    const historyListGroup = todayH3.closest('.history-list-group');
    if (historyListGroup) {
      // history-listを取得
      const historyList = historyListGroup.querySelector('.history-list');
      if (historyList) {
        console.log('今日のhistory-list:', historyList);
        const divElements = Array.from(historyList.querySelectorAll('li div[data-v-16531082]'));
        console.log('取得したdiv要素のリスト:', divElements);

        // 出勤時間を取得
        const shukkinDiv = divElements.find(div => 
          div.classList.contains('tw-mr-8') && 
          div.classList.contains('tw-w-[72px]') && 
          div.classList.contains('mobile:tw-w-auto') && 
          div.textContent.trim() === '出勤'
        );

        if (shukkinDiv) {
          // 出勤時間の要素を取得（出勤の要素の次のdiv要素）
          const timeDiv = shukkinDiv.nextElementSibling;
          if (timeDiv && timeDiv.hasAttribute('data-v-16531082')) {
            shukkinTime = timeDiv.textContent.trim();
            console.log('出勤時間:', shukkinTime);
          } else {
            console.log('出勤時間の要素が見つかりません。');
          }
        } else {
          console.log('出勤の要素が見つかりません。');
        }

        // 休憩時間のセットを格納する配列
        breakTimes = [];
        let currentBreakStart = null;

        // 要素を下から上に処理
        for (let i = divElements.length - 1; i >= 0; i--) {
          const div = divElements[i];
          const text = div.textContent.trim();
          
          if (text === '休憩開始') {
            // 休憩開始時間を取得
            const timeDiv = div.nextElementSibling;
            if (timeDiv && timeDiv.hasAttribute('data-v-16531082')) {
              currentBreakStart = timeDiv.textContent.trim();
              // 休憩終了を探す
              let foundEnd = false;
              for (let j = i - 1; j >= 0; j--) {
                const nextDiv = divElements[j];
                const nextText = nextDiv.textContent.trim();
                if (nextText === '休憩終了') {
                  const endTimeDiv = nextDiv.nextElementSibling;
                  if (endTimeDiv && endTimeDiv.hasAttribute('data-v-16531082')) {
                    const breakEnd = endTimeDiv.textContent.trim();
                    // 休憩開始と終了のセットを配列に追加
                    breakTimes.push([currentBreakStart, breakEnd]);
                    foundEnd = true;
                    break;
                  }
                }
              }
              // 休憩終了が見つからない場合（休憩中）
              if (!foundEnd) {
                breakTimes.push([currentBreakStart, null]);
              }
              currentBreakStart = null;
            }
          }
        }

        console.log('休憩時間のセット:', breakTimes);

        // 退勤時間を取得
        const taikinDiv = divElements.find(div => 
          div.classList.contains('tw-mr-8') && 
          div.classList.contains('tw-w-[72px]') && 
          div.classList.contains('mobile:tw-w-auto') && 
          div.textContent.trim() === '退勤'
        );

        if (taikinDiv) {
          // 退勤時間の要素を取得（退勤の要素の次のdiv要素）
          const timeDiv = taikinDiv.nextElementSibling;
          if (timeDiv && timeDiv.hasAttribute('data-v-16531082')) {
            const taikinTime = timeDiv.textContent.trim();
            console.log('退勤時間:', taikinTime);
          } else {
            console.log('退勤時間の要素が見つかりません。');
          }
        } else {
          console.log('退勤の要素が見つかりません。');
        }

        // 実労働時間の計算
        function calculateWorkTime(shukkinTime, breakTimes) {
          // 現在時刻を取得
          let currentTime;
          if (DEBUG) {
            if (!pageLoadTime) {
              pageLoadTime = new Date();
            }
            // 経過時間を計算（分）
            const elapsedMinutes = Math.floor((new Date() - pageLoadTime) / 1000 / 60);
            
            // 開始時刻を分に変換
            const [startHour, startMinute] = DEBUG_START_TIME.split(':').map(Number);
            const startTotalMinutes = startHour * 60 + startMinute;
            
            // 経過時間を加算
            const currentTotalMinutes = startTotalMinutes + elapsedMinutes;
            const currentHour = Math.floor(currentTotalMinutes / 60) % 24;
            const currentMinute = currentTotalMinutes % 60;
            
            currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
            console.log('デバッグモード: 経過時間', elapsedMinutes, '分');
            console.log('デバッグモード: 現在時刻を', currentTime, 'に設定');
          } else {
            const now = new Date();
            currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          }
          
          // 出勤時間を分に変換
          const [shukkinHour, shukkinMinute] = shukkinTime.split(':').map(Number);
          const shukkinTotalMinutes = shukkinHour * 60 + shukkinMinute;
          
          // 退勤時間を取得
          const taikinDiv = divElements.find(div => 
            div.classList.contains('tw-mr-8') && 
            div.classList.contains('tw-w-[72px]') && 
            div.classList.contains('mobile:tw-w-auto') && 
            div.textContent.trim() === '退勤'
          );

          let endTime;
          if (taikinDiv) {
            // 退勤時間の要素を取得（退勤の要素の次のdiv要素）
            const timeDiv = taikinDiv.nextElementSibling;
            if (timeDiv && timeDiv.hasAttribute('data-v-16531082')) {
              endTime = timeDiv.textContent.trim();
              console.log('退勤時間:', endTime);
            }
          }

          // 終了時間を分に変換（退勤時間がある場合は退勤時間、ない場合は現在時刻）
          const [endHour, endMinute] = (endTime || currentTime).split(':').map(Number);
          const endTotalMinutes = endHour * 60 + endMinute;
          
          // 休憩時間の合計を計算
          let breakTotalMinutes = 0;
          for (let i = 0; i < breakTimes.length; i++) {
            const [start, end] = breakTimes[i];
            
            // 最後の要素で休憩終了がない場合（休憩中）
            if (i === breakTimes.length - 1 && !end) {
              const [startHour, startMinute] = start.split(':').map(Number);
              const startTotalMinutes = startHour * 60 + startMinute;
              const [currentHour, currentMinute] = currentTime.split(':').map(Number);
              const currentTotalMinutes = currentHour * 60 + currentMinute;
              breakTotalMinutes += currentTotalMinutes - startTotalMinutes;
            } else {
              const [startHour, startMinute] = start.split(':').map(Number);
              const [endHour, endMinute] = end.split(':').map(Number);
              const startTotalMinutes = startHour * 60 + startMinute;
              const endTotalMinutes = endHour * 60 + endMinute;
              breakTotalMinutes += endTotalMinutes - startTotalMinutes;
            }
          }
          
          // 8時間以上の勤務で休憩時間が1時間未満の場合、休憩時間を1時間に設定
          if (scheduledWorkHours >= 8 && breakTotalMinutes < 60) {
            breakTotalMinutes = 60;
          }
          
          // 実労働時間を計算（分）
          const workMinutes = endTotalMinutes - shukkinTotalMinutes - breakTotalMinutes;
          
          console.log('デバッグ: 出勤時間:', shukkinTime);
          console.log('デバッグ: 終了時間:', endTime || currentTime);
          console.log('デバッグ: 休憩時間合計:', breakTotalMinutes, '分');
          console.log('デバッグ: 実労働時間:', workMinutes, '分');
          
          return {
            workMinutes,
            currentTime: endTime || currentTime
          };
        }

        // メーター表示のスタイルを追加
        const style = document.createElement('style');
        style.textContent = `
          .work-time-meter-container {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background-color: white;
            padding: 10px;
            box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
            z-index: 1000;
          }
          .hide-button {
            padding: 5px 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background-color: #f0f0f0;
            cursor: pointer;
            font-size: 12px;
          }
          .hide-button:hover {
            background-color: #e0e0e0;
          }
          .work-time-meter-container.hidden {
            display: none;
          }
          .work-time-meter {
            width: 100%;
            height: 20px;
            background-color: #f0f0f0;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
          }
          .work-time-progress {
            height: 100%;
            background-color: #4aa3de;
            transition: width 0.3s ease;
          }
          .work-time-info {
            font-size: 14px;
            color: #666;
            margin-top: 5px;
            text-align: center;
          }
          .scheduled-time-input {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin-bottom: 10px;
          }
          .scheduled-time-input input {
            width: 60px;
            padding: 5px;
            border: 1px solid #ddd;
            border-radius: 4px;
            text-align: center;
          }
          .scheduled-time-input label {
            font-size: 14px;
            color: #666;
          }
          .display-mode-toggle {
            display: flex;
            justify-content: center;
            margin-bottom: 10px;
          }
          .display-mode-toggle button {
            padding: 5px 10px;
            margin: 0 5px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background-color: #f0f0f0;
            cursor: pointer;
          }
          .display-mode-toggle button.active,
          .display-mode-toggle button.hide-button.active {
            background-color: #4aa3de;
            color: white;
          }
          .pie-chart-container {
            display: flex;
            flex-direction: row;
            align-items: center;
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
          }
          .pie-side-interface {
            margin-left: 16px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .pie-chart {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            background: conic-gradient(#4aa3de 0% var(--progress), #f0f0f0 var(--progress) 100%);
            transition: background 0.5s cubic-bezier(0.4,0,0.2,1);
            position: relative;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          }
          .pie-chart::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80%;
            height: 80%;
            background: white;
            border-radius: 50%;
          }
          .pie-chart-info {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            z-index: 1;
            font-size: 12px;
            white-space: nowrap;
          }
          .work-time-meter-container.pie-mode,
          .work-time-meter-container .hide-button.active ~ .bar-chart-container {
            background: transparent !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          .work-time-meter-container.pie-mode .bar-chart-container,
          .work-time-meter-container .hide-button.active ~ .bar-chart-container {
            display: none !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .work-time-meter-container.hidden .bar-chart-container,
          .work-time-meter-container.hidden .pie-chart-container,
          .work-time-meter-container.hidden .scheduled-time-input,
          .work-time-meter-container.hidden .work-time-info {
            display: none !important;
          }
          .work-time-meter-container.hidden {
            background: transparent !important;
            box-shadow: none !important;
            padding: 5px !important;
          }
          .work-time-meter-container.hidden .display-mode-toggle {
            margin-bottom: 0;
          }
        `;
        document.head.appendChild(style);

        // メーター要素を作成
        const meterContainer = document.createElement('div');
        meterContainer.className = 'work-time-meter-container';
        
        // localStorageから表示モードを読み込む
        const savedDisplayMode = localStorage.getItem('displayMode') || 'bar';
        
        meterContainer.innerHTML = `
          <div class="display-mode-toggle">
            <button class="bar-mode ${savedDisplayMode === 'bar' ? 'active' : ''}">バーグラフ</button>
            <button class="pie-mode ${savedDisplayMode === 'pie' ? 'active' : ''}">円グラフ</button>
            <button class="hide-button">非表示</button>
          </div>
          <div class="bar-chart-container" style="display: ${savedDisplayMode === 'bar' ? 'block' : 'none'}">
            <div class="work-time-meter">
              <div class="work-time-progress" style="width: 0%"></div>
            </div>
          </div>
          <div class="pie-chart-container" style="display: ${savedDisplayMode === 'pie' ? 'flex' : 'none'}">
            <div class="pie-chart">
              <div class="pie-chart-info"></div>
            </div>
            <div class="pie-side-interface"></div>
          </div>
        `;

        // 初期状態が円グラフの場合、pie-modeクラスを追加
        if (savedDisplayMode === 'pie') {
          meterContainer.classList.add('pie-mode');
        }

        document.body.appendChild(meterContainer);

/*         // localStorageから非表示状態を読み込んで適用
        const isHidden = localStorage.getItem('isHidden');
        if (isHidden) {
          hideButton.classList.add('active');
          barModeButton.classList.remove('active');
          pieModeButton.classList.remove('active');
          meterContainer.classList.add('pie-mode');
          barChartContainer.style.display = 'none';
          pieChartContainer.style.display = 'none';
          barChartContainer.appendChild(scheduledInput);
          barChartContainer.appendChild(info);
        } */

        // 予定労働時間入力・情報表示を1つだけ生成
        const scheduledInput = document.createElement('div');
        scheduledInput.className = 'scheduled-time-input';
        scheduledInput.innerHTML = `
          <label for="scheduled-hours">予定労働時間:</label>
          <input type="number" id="scheduled-hours" min="0" max="24" value="${Math.floor(scheduledWorkHours)}">
          <label>時間</label>
          <input type="number" id="scheduled-minutes" min="0" max="45" step="15" value="${(scheduledWorkHours % 1) * 60}">
          <label>分</label>
        `;
        const info = document.createElement('div');
        info.className = 'work-time-info';

        // 要素取得
        const scheduledHoursInput = scheduledInput.querySelector('#scheduled-hours');
        const scheduledMinutesInput = scheduledInput.querySelector('#scheduled-minutes');
        const barModeButton = meterContainer.querySelector('.bar-mode');
        const pieModeButton = meterContainer.querySelector('.pie-mode');
        const barChartContainer = meterContainer.querySelector('.bar-chart-container');
        const pieChartContainer = meterContainer.querySelector('.pie-chart-container');
        const progress = meterContainer.querySelector('.work-time-progress');
        const pieChart = meterContainer.querySelector('.pie-chart');
        const pieChartInfo = meterContainer.querySelector('.pie-chart-info');
        const pieSideInterface = meterContainer.querySelector('.pie-side-interface');

        // 初期状態の表示モードに応じてインターフェースを追加
        if (savedDisplayMode === 'bar') {
          barChartContainer.appendChild(scheduledInput);
          barChartContainer.appendChild(info);
        } else {
          pieSideInterface.appendChild(scheduledInput);
          pieSideInterface.appendChild(info);
        }

        // モード切り替え
        barModeButton.addEventListener('click', () => {
          hideButton.classList.remove('active');
          barModeButton.classList.add('active');
          pieModeButton.classList.remove('active');
          // 一度両方非表示にしてから必要な方だけ表示
          barChartContainer.style.display = 'none';
          pieChartContainer.style.display = 'none';
          setTimeout(() => {
            barChartContainer.style.display = 'block';
            pieChartContainer.style.display = 'none';
          }, 0);
          meterContainer.classList.remove('pie-mode');
          // インターフェースを元に戻す
          barChartContainer.appendChild(scheduledInput);
          barChartContainer.appendChild(info);
          // 表示モードを保存
          localStorage.setItem('displayMode', 'bar');
          localStorage.setItem('isHidden', false);
          updateMeter();
        });
        pieModeButton.addEventListener('click', () => {
          hideButton.classList.remove('active');
          pieModeButton.classList.add('active');
          barModeButton.classList.remove('active');
          // 一度両方非表示にしてから必要な方だけ表示
          barChartContainer.style.display = 'none';
          pieChartContainer.style.display = 'none';
          setTimeout(() => {
            barChartContainer.style.display = 'none';
            pieChartContainer.style.display = 'flex';
          }, 0);
          meterContainer.classList.add('pie-mode');
          // インターフェースを円グラフ横に移動
          pieSideInterface.appendChild(scheduledInput);
          pieSideInterface.appendChild(info);
          // 表示モードを保存
          localStorage.setItem('displayMode', 'pie');
          localStorage.setItem('isHidden', false);
          updateMeter();
        });

        // 予定労働時間の入力イベント
        function updateScheduledTime() {
          const hours = parseInt(scheduledHoursInput.value) || 0;
          const minutes = parseInt(scheduledMinutesInput.value) || 0;
          scheduledWorkHours = hours + (minutes / 60);
          // 予定労働時間を保存
          localStorage.setItem('scheduledWorkHours', scheduledWorkHours.toString());
          updateMeter();
        }
        scheduledHoursInput.addEventListener('change', (e) => {
          const value = parseInt(e.target.value);
          if (value >= 0 && value <= 24) {
            updateScheduledTime();
          } else {
            e.target.value = Math.floor(scheduledWorkHours);
          }
        });
        scheduledMinutesInput.addEventListener('change', (e) => {
          const value = parseInt(e.target.value);
          if (value >= 0 && value <= 45 && value % 15 === 0) {
            updateScheduledTime();
          } else {
            e.target.value = (scheduledWorkHours % 1) * 60;
          }
        });

        // 円グラフ進捗アニメーション用の現在値
        let currentPieProgress = 0;
        let pieAnimationFrame = null;

        function animatePieChart(targetProgress) {
          if (pieAnimationFrame) {
            cancelAnimationFrame(pieAnimationFrame);
          }
          function step() {
            const diff = targetProgress - currentPieProgress;
            if (Math.abs(diff) < 0.001) {
              currentPieProgress = targetProgress;
            } else {
              currentPieProgress += diff * 0.2; // 補間係数
            }
            if (pieChart) {
              pieChart.style.background = `conic-gradient(#4aa3de 0% ${currentPieProgress * 100}%, #f0f0f0 ${currentPieProgress * 100}% 100%)`;
            }
            if (Math.abs(diff) >= 0.001) {
              pieAnimationFrame = requestAnimationFrame(step);
            }
          }
          step();
        }

        // メーターを更新する関数
        function updateMeter() {
          if (!shukkinTime) {
            console.log('出勤時間が取得できていません。');
            return;
          }
          const { workMinutes, currentTime } = calculateWorkTime(shukkinTime, breakTimes);
          const maxMinutes = scheduledWorkHours * 60;
          const progressPercentage = Math.min(workMinutes, maxMinutes) / maxMinutes;
          if (progress) progress.style.width = `${progressPercentage * 100}%`;
          if (pieChart) {
            animatePieChart(progressPercentage);
          }
          let hours;
          if(workMinutes < 0) {
            hours = Math.ceil(workMinutes / 60);
          }
          else {
            hours = Math.floor(workMinutes / 60);
          }
          const minutes = workMinutes % 60;

          // 退勤予定時刻の計算
          const [shukkinHour, shukkinMinute] = shukkinTime.split(':').map(Number);
          const shukkinTotalMinutes = shukkinHour * 60 + shukkinMinute;
          
          // 休憩時間の合計を計算
          let breakTotalMinutes = 0;
          for (let i = 0; i < breakTimes.length; i++) {
            const [start, end] = breakTimes[i];
            
            // 最後の要素で休憩終了がない場合（休憩中）
            if (i === breakTimes.length - 1 && !end) {
              const [startHour, startMinute] = start.split(':').map(Number);
              const startTotalMinutes = startHour * 60 + startMinute;
              const [currentHour, currentMinute] = currentTime.split(':').map(Number);
              const currentTotalMinutes = currentHour * 60 + currentMinute;
              breakTotalMinutes += currentTotalMinutes - startTotalMinutes;
            } else {
              const [startHour, startMinute] = start.split(':').map(Number);
              const [endHour, endMinute] = end.split(':').map(Number);
              const startTotalMinutes = startHour * 60 + startMinute;
              const endTotalMinutes = endHour * 60 + endMinute;
              breakTotalMinutes += endTotalMinutes - startTotalMinutes;
            }
          }

          // 8時間以上の勤務で休憩時間が1時間未満の場合、休憩時間を1時間に設定
          if (scheduledWorkHours >= 8 && breakTotalMinutes < 60) {
            breakTotalMinutes = 60;
          }

          const scheduledEndTotalMinutes = shukkinTotalMinutes + (scheduledWorkHours * 60) + breakTotalMinutes;
          const scheduledEndHour = Math.floor(scheduledEndTotalMinutes / 60) % 24;
          const scheduledEndMinute = scheduledEndTotalMinutes % 60;
          const scheduledEndTime = `${scheduledEndHour.toString().padStart(2, '0')}:${scheduledEndMinute.toString().padStart(2, '0')}`;

          const infoText = `現在時刻: ${currentTime} | 実労働時間: ${hours}時間${minutes}分 | 予定: ${scheduledWorkHours}時間 | 退勤予定: ${scheduledEndTime}`;
          if (info) info.textContent = infoText;
          if (pieChartInfo) pieChartInfo.textContent = `${hours}時間${minutes}分`;
        }

        // 非表示ボタンの機能を追加
        const hideButton = meterContainer.querySelector('.hide-button');
        hideButton.addEventListener('click', () => {
          hideButton.classList.toggle('active');
          barModeButton.classList.remove('active');
          pieModeButton.classList.remove('active');
          
          // グラフコンテナの表示/非表示を切り替え
          if (hideButton.classList.contains('active')) {
            meterContainer.classList.add('pie-mode');
            barChartContainer.style.display = 'none';
            pieChartContainer.style.display = 'none';
          } else {
            meterContainer.classList.remove('pie-mode');
            barChartContainer.style.display = 'block';
            pieChartContainer.style.display = 'none';
          }
          
          // インターフェースの表示/非表示を切り替え
          if (hideButton.classList.contains('active')) {
            barChartContainer.appendChild(scheduledInput);
            barChartContainer.appendChild(info);
          }

          // 非表示状態をlocalStorageに保存
          localStorage.setItem('isHidden', true);
          
          updateMeter();
        });

        // メーターをページに追加
        document.body.appendChild(meterContainer);
        
        // 初期表示
        updateMeter();
        
        // 1秒ごとに更新（より滑らかな時間経過のため）
        setInterval(updateMeter, 1000);

        // history-listの変更を監視
        const historyListObserver = new MutationObserver((mutations) => {
          // 変更があった場合、データを再取得
          console.log('history-listの内容が変更されました。データを再取得します。');
          const divElements = Array.from(historyList.querySelectorAll('li div[data-v-16531082]'));
          
          // 出勤時間を再取得
          const shukkinDiv = divElements.find(div => 
            div.classList.contains('tw-mr-8') && 
            div.classList.contains('tw-w-[72px]') && 
            div.classList.contains('mobile:tw-w-auto') && 
            div.textContent.trim() === '出勤'
          );

          if (shukkinDiv) {
            const timeDiv = shukkinDiv.nextElementSibling;
            if (timeDiv && timeDiv.hasAttribute('data-v-16531082')) {
              shukkinTime = timeDiv.textContent.trim();
              console.log('出勤時間を再取得:', shukkinTime);
            }
          }

          // 休憩時間を再取得
          breakTimes = [];
          let currentBreakStart = null;

          // 要素を下から上に処理
          for (let i = divElements.length - 1; i >= 0; i--) {
            const div = divElements[i];
            const text = div.textContent.trim();
            
            if (text === '休憩開始') {
              const timeDiv = div.nextElementSibling;
              if (timeDiv && timeDiv.hasAttribute('data-v-16531082')) {
                currentBreakStart = timeDiv.textContent.trim();
                let foundEnd = false;
                for (let j = i - 1; j >= 0; j--) {
                  const nextDiv = divElements[j];
                  const nextText = nextDiv.textContent.trim();
                  if (nextText === '休憩終了') {
                    const endTimeDiv = nextDiv.nextElementSibling;
                    if (endTimeDiv && endTimeDiv.hasAttribute('data-v-16531082')) {
                      const breakEnd = endTimeDiv.textContent.trim();
                      breakTimes.push([currentBreakStart, breakEnd]);
                      foundEnd = true;
                      break;
                    }
                  }
                }
                if (!foundEnd) {
                  breakTimes.push([currentBreakStart, null]);
                }
                currentBreakStart = null;
              }
            }
          }
          console.log('休憩時間を再取得:', breakTimes);
        });

        // history-listの監視を開始
        historyListObserver.observe(historyList, {
          childList: true,
          subtree: true,
          characterData: true
        });
      } else {
        console.log('history-listが見つかりません。');
      }
    } else {
      console.log('history-list-groupが見つかりません。');
    }
  } else {
    console.log('今日の日付のh3要素が見つかりません。');
  }
}

// MutationObserverの設定
const observer = new MutationObserver((mutations) => {
  // 監視対象の要素が追加されたか確認
  const hasNewContent = mutations.some(mutation => 
    mutation.addedNodes.length > 0 && 
    Array.from(mutation.addedNodes).some(node => 
      node.nodeType === Node.ELEMENT_NODE &&
      (node.classList.contains('tw-h-[220px]') || 
       node.classList.contains('history-list-group'))
    )
  );

  if (hasNewContent) {
    console.log('新しいコンテンツが追加されました。処理を実行します。');
    processElements();
  }
});

// 監視を開始（より具体的な要素を監視）
const targetElement = document.querySelector('.tw-h-\\[220px\\]') || document.body;
observer.observe(targetElement, {
  childList: true,
  subtree: true
});

// 初期実行（DOMContentLoadedイベントで実行）
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded: 初期処理を実行します');
  processElements();
});

// 念のため、loadイベントでも実行
window.addEventListener('load', () => {
  console.log('load: 初期処理を実行します');
  processElements();
});
