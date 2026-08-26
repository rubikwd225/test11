import { db } from "./firebase.js";

import {
    collection,
    onSnapshot,
    updateDoc,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";


// ========================================
// HTML
// ========================================

const ticketList =
    document.getElementById("ticketList");

const loading =
    document.getElementById("loading");

const dayRadios =
    document.querySelectorAll(
        'input[name="day"]'
    );


// ========================================
// QR
// ========================================

const qrStartBtn =
    document.getElementById("qrStartBtn");

const qrStopBtn =
    document.getElementById("qrStopBtn");

const qrReader =
    document.getElementById("qrReader");

const qrResult =
    document.getElementById("qrResult");


// ========================================
// 変数
// ========================================

let collectionName =
    "tickets_day1";

let unsubscribe =
    null;

let qrScanner =
    null;

let qrScanning =
    false;

let qrProcessing =
    false;


// ========================================
// QRで検索するコレクション
// ========================================

const qrCollections = [

    "tickets_day1",

    "tickets_day2",

    "tickets_day3",

    "special_tickets"

];


// ========================================
// 日付変更
// ========================================

dayRadios.forEach(radio => {

    radio.addEventListener(
        "change",
        () => {

            collectionName =
                radio.value;

            startRealtimeListener();

        }
    );

});


// ========================================
// 初期読み込み
// ========================================

startRealtimeListener();


// ========================================
// 通常のチケット一覧
// ========================================

function startRealtimeListener() {

    if (unsubscribe) {

        unsubscribe();

        unsubscribe = null;

    }


    ticketList.innerHTML = "";

    loading.style.display =
        "block";


    const ticketsRef =
        collection(
            db,
            collectionName
        );


    unsubscribe =
        onSnapshot(

            ticketsRef,

            snapshot => {

                const tickets = [];


                snapshot.forEach(ticketDoc => {

                    const data =
                        ticketDoc.data();


                    tickets.push({

                        id:
                            ticketDoc.id,

                        number:
                            data.number ??
                            ticketDoc.id,

                        status:
                            data.status ??
                            "waiting"

                    });

                });


                // 番号順

                tickets.sort(
                    (a, b) => {

                        const numberA =
                            Number(a.number);

                        const numberB =
                            Number(b.number);


                        if (
                            !isNaN(numberA) &&
                            !isNaN(numberB)
                        ) {

                            return numberA - numberB;

                        }


                        return String(a.number)
                            .localeCompare(
                                String(b.number),
                                "ja"
                            );

                    }
                );


                loading.style.display =
                    "none";


                if (
                    tickets.length === 0
                ) {

                    ticketList.innerHTML = `

                        <div class="error">

                            チケットがありません。

                        </div>

                    `;

                    return;

                }


                renderTickets(tickets);

            },

            error => {

                console.error(
                    "Firestore監視エラー:",
                    error
                );


                loading.style.display =
                    "none";


                ticketList.innerHTML = `

                    <div class="error">

                        チケットの読み込みに
                        失敗しました。

                    </div>

                `;

            }

        );

}


// ========================================
// 一覧表示
// ========================================

function renderTickets(tickets) {

    ticketList.innerHTML = "";


    tickets.forEach(ticket => {

        createTicketElement(ticket);

    });

}


// ========================================
// チケットカード
// ========================================

function createTicketElement(ticket) {

    const element =
        document.createElement("div");


    element.className =
        "ticket";


    const statusText =
        getStatusText(
            ticket.status
        );


    const statusClass =
        getStatusClass(
            ticket.status
        );


    element.innerHTML = `

        <div class="ticket-info">

            <div class="ticket-number">

                No.${ticket.number}

            </div>


            <div class="ticket-id">

                ID: ${ticket.id}

            </div>


            <div
                class="ticket-status ${statusClass}"
            >

                ${statusText}

            </div>

        </div>


        <select
            class="status-select ${getSelectClass(ticket.status)}"
        >

            <option
                value="waiting"
                ${
                    ticket.status === "waiting"
                        ? "selected"
                        : ""
                }
            >
                受付前
            </option>


            <option
                value="accepted"
                ${
                    ticket.status === "accepted"
                        ? "selected"
                        : ""
                }
            >
                受付済み
            </option>


            <option
                value="entered"
                ${
                    ticket.status === "entered"
                        ? "selected"
                        : ""
                }
            >
                入場済み
            </option>


            <option
                value="invalid"
                ${
                    ticket.status === "invalid"
                        ? "selected"
                        : ""
                }
            >
                無効
            </option>

        </select>

    `;


    const select =
        element.querySelector(
            ".status-select"
        );


    const statusElement =
        element.querySelector(
            ".ticket-status"
        );


    // ====================================
    // プルダウン変更
    // ====================================

    select.addEventListener(
        "change",
        async () => {

            const newStatus =
                select.value;


            select.classList.add(
                "updating"
            );


            try {

                const ticketRef =
                    doc(
                        db,
                        collectionName,
                        ticket.id
                    );


                await updateDoc(

                    ticketRef,

                    {
                        status:
                            newStatus
                    }

                );


                statusElement.textContent =
                    getStatusText(
                        newStatus
                    );


                statusElement.className =
                    "ticket-status " +
                    getStatusClass(
                        newStatus
                    );


                select.className =
                    "status-select " +
                    getSelectClass(
                        newStatus
                    );


                select.classList.remove(
                    "updating"
                );

            }

            catch (error) {

                console.error(error);


                alert(
                    "ステータスの変更に失敗しました。"
                );


                select.value =
                    ticket.status;


                select.className =
                    "status-select " +
                    getSelectClass(
                        ticket.status
                    );


                select.classList.remove(
                    "updating"
                );

            }

        }
    );


    ticketList.appendChild(
        element
    );

}


// ========================================
// プルダウンCSS
// ========================================

function getSelectClass(status) {

    switch (status) {

        case "waiting":

            return "select-waiting";

        case "accepted":

            return "select-accepted";

        case "entered":

            return "select-entered";

        case "invalid":

            return "select-invalid";

        default:

            return "select-waiting";

    }

}


// ========================================
// QR開始
// ========================================

qrStartBtn.onclick =
    () => {

        startQRScanner();

    };


// ========================================
// QRスキャナー開始
// ========================================

async function startQRScanner() {

    if (qrScanning) {

        return;

    }


    qrProcessing = false;


    qrResult.style.display =
        "none";

    qrResult.innerHTML =
        "";


    qrStartBtn.style.display =
        "none";


    qrStopBtn.style.display =
        "block";


    qrReader.style.display =
        "block";


    qrScanner =
        new Html5Qrcode(
            "qrReader"
        );


    try {

        qrScanning = true;


        await qrScanner.start(

            {
                facingMode:
                    "environment"
            },

            {
                fps: 10,

                qrbox: {
                    width: 250,
                    height: 250
                }

            },

            qrScanSuccess,

            () => {}

        );

    }

    catch (error) {

        console.error(error);


        qrScanning = false;


        qrReader.style.display =
            "none";


        qrStopBtn.style.display =
            "none";


        qrStartBtn.style.display =
            "block";


        showQRResult(

            "error",

            "カメラエラー",

            "カメラを起動できませんでした。"

        );

    }

}


// ========================================
// QR読み取り成功
// ========================================

async function qrScanSuccess(text) {

    if (
        !qrScanning ||
        qrProcessing
    ) {

        return;

    }


    qrProcessing = true;


    await stopQRScanner();


    const ticketId =
        text.trim();


    await findTicketByQR(
        ticketId
    );

}


// ========================================
// QRから全コレクションを検索
// ========================================

async function findTicketByQR(ticketId) {

    try {

        let foundCollection =
            null;

        let foundData =
            null;


        // ====================================
        // DAY1～DAY3＋特別券を順番に検索
        // ====================================

        for (
            const targetCollection
            of qrCollections
        ) {

            const ticketRef =
                doc(
                    db,
                    targetCollection,
                    ticketId
                );


            const snap =
                await getDoc(
                    ticketRef
                );


            if (snap.exists()) {

                foundCollection =
                    targetCollection;

                foundData =
                    snap.data();

                break;

            }

        }


        // ====================================
        // 見つからない
        // ====================================

        if (
            foundCollection === null
        ) {

            showQRResult(

                "error",

                "チケットが見つかりません",

                `ID「${ticketId}」の整理券はありません。`

            );

            return;

        }


        const number =
            foundData.number ??
            ticketId;


        const status =
            foundData.status ??
            "waiting";


        // ====================================
        // 見つかったチケットを表示
        // ====================================

        showTicketControl(

            foundCollection,

            ticketId,

            number,

            status

        );

    }

    catch (error) {

        console.error(
            "QRチケット検索エラー:",
            error
        );


        showQRResult(

            "error",

            "エラー",

            "チケットの取得に失敗しました。"

        );

    }

}


// ========================================
// 日付名
// ========================================

function getCollectionText(
    collectionName
) {

    switch (collectionName) {

        case "tickets_day1":

            return "1日目";

        case "tickets_day2":

            return "2日目";

        case "tickets_day3":

            return "3日目";

        case "special_tickets":

            return "特別招待券";

        default:

            return "不明";

    }

}


// ========================================
// QR結果
// ========================================

function showQRResult(
    type,
    title,
    message
) {

    qrResult.className =
        `qr-result ${type}`;


    qrResult.style.display =
        "block";


    qrResult.innerHTML = `

        <div class="qr-result-title">

            ${title}

        </div>


        <div class="qr-result-message">

            ${message}

        </div>


        <button
            id="qrCloseBtn"
            class="qr-close-btn"
        >

            閉じる

        </button>

    `;


    setupQRCloseButton();

}


// ========================================
// QRチケット操作画面
// ========================================

function showTicketControl(
    ticketCollection,
    ticketId,
    number,
    status
) {

    qrResult.className =
        "qr-ticket-control";


    qrResult.style.display =
        "block";


    qrResult.innerHTML = `

        <div class="qr-ticket-day">

            ${getCollectionText(ticketCollection)}

        </div>


        <div class="qr-ticket-number">

            No.${number}

        </div>


        <div class="qr-ticket-id">

            ID: ${ticketId}

        </div>


        <div class="qr-current-status">

            現在の状態：

            <span class="${getStatusClass(status)}">

                ${getStatusText(status)}

            </span>

        </div>


        <div class="qr-status-buttons">

            <button
                class="qr-status-btn qr-waiting"
                data-status="waiting"
            >
                受付前
            </button>


            <button
                class="qr-status-btn qr-accepted"
                data-status="accepted"
            >
                受付済み
            </button>


            <button
                class="qr-status-btn qr-entered"
                data-status="entered"
            >
                入場済み
            </button>


            <button
                class="qr-status-btn qr-invalid"
                data-status="invalid"
            >
                無効
            </button>

        </div>


        <button
            id="qrCloseBtn"
            class="qr-close-btn"
        >

            閉じる

        </button>

    `;


    const buttons =
        qrResult.querySelectorAll(
            ".qr-status-btn"
        );


    buttons.forEach(button => {

        button.addEventListener(
            "click",
            async () => {

                const newStatus =
                    button.dataset.status;


                buttons.forEach(btn => {

                    btn.disabled =
                        true;

                });


                try {

                    const ticketRef =
                        doc(
                            db,
                            ticketCollection,
                            ticketId
                        );


                    await updateDoc(

                        ticketRef,

                        {
                            status:
                                newStatus
                        }

                    );


                    showTicketControl(

                        ticketCollection,

                        ticketId,

                        number,

                        newStatus

                    );

                }

                catch (error) {

                    console.error(error);


                    alert(
                        "ステータスの変更に失敗しました。"
                    );


                    buttons.forEach(btn => {

                        btn.disabled =
                            false;

                    });

                }

            }
        );

    });


    setupQRCloseButton();

}


// ========================================
// QR閉じる
// ========================================

function setupQRCloseButton() {

    const closeBtn =
        document.getElementById(
            "qrCloseBtn"
        );


    if (!closeBtn) {

        return;

    }


    closeBtn.onclick = () => {

        qrResult.style.display =
            "none";

        qrResult.innerHTML =
            "";

        qrProcessing =
            false;

    };

}


// ========================================
// QRカメラ停止
// ========================================

async function stopQRScanner() {

    if (qrScanner) {

        try {

            await qrScanner.stop();

        }

        catch (error) {

            console.log(
                "QR scanner stop error:",
                error
            );

        }


        try {

            await qrScanner.clear();

        }

        catch (error) {

            console.log(
                "QR scanner clear error:",
                error
            );

        }


        qrScanner =
            null;

    }


    qrScanning =
        false;


    qrReader.style.display =
        "none";


    qrStopBtn.style.display =
        "none";


    qrStartBtn.style.display =
        "block";

}


// ========================================
// QRカメラ閉じる
// ========================================

qrStopBtn.onclick =
    async () => {

        await stopQRScanner();


        qrResult.style.display =
            "none";


        qrResult.innerHTML =
            "";


        qrProcessing =
            false;

    };


// ========================================
// ステータス名
// ========================================

function getStatusText(status) {

    switch (status) {

        case "waiting":

            return "受付前";

        case "accepted":

            return "受付済み";

        case "entered":

            return "入場済み";

        case "invalid":

            return "無効";

        default:

            return "不明";

    }

}


// ========================================
// ステータスCSS
// ========================================

function getStatusClass(status) {

    switch (status) {

        case "waiting":

            return "status-waiting";

        case "accepted":

            return "status-accepted";

        case "entered":

            return "status-entered";

        case "invalid":

            return "status-invalid";

        default:

            return "";

    }

}