import { auth, db } from "./firebase-config.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendEmailVerification
}
from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {
    doc,
    setDoc,
    getDoc,
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    serverTimestamp
}
from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

console.log("Health Sentinel Started");

/* =========================================
GLOBAL VARIABLES
========================================= */

let bpChart = null;
let glucoseChart = null;
let spo2Chart = null;

let readings = [];

/* =========================================
SAFE ELEMENT HELPER
========================================= */

function el(id) {
    return document.getElementById(id);
}

/* =========================================
SHOW PAGE
========================================= */
function showPage(page){

    console.log("Showing:", page);

    const login = document.getElementById("loginScreen");
    const verify = document.getElementById("verifyPage");
    const profile = document.getElementById("profilePage");
    const dashboard = document.getElementById("dashboardPage");

    login.style.display = "none";
    verify.style.display = "none";
    profile.style.display = "none";
    dashboard.style.display = "none";

    console.log("Login display:", login.style.display);

    if(page==="loginScreen") login.style.display="grid";
    if(page==="verifyPage") verify.style.display="flex";
    if(page==="profilePage") profile.style.display="block";
    if(page==="dashboardPage") dashboard.style.display="block";
}
/* =========================================
REGISTER USER
========================================= */

window.registerUser = async () => {

    try {

        const name =
            el("regName")?.value.trim();

        const email =
            el("authEmail")?.value.trim();

        const password =
            el("authPassword")?.value.trim();

        if (!name || !email || !password) {

            alert("Please fill all fields");
            return;
        }

        const userCredential =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

        await setDoc(
            doc(
                db,
                "users",
                userCredential.user.uid
            ),
            {
                name,
                email,
                createdAt: new Date().toISOString()
            }
        );

        await sendEmailVerification(
            userCredential.user
        );

        if (el("verifyEmailText")) {

            el("verifyEmailText").innerHTML =
                `<strong>${email}</strong>`;
        }

        showPage("verifyPage");

        alert(
            "Verification email sent. Please verify your email."
        );

    }
    catch (error) {

        console.error(error);

        alert(
            error.code +
            "\n" +
            error.message
        );
    }

};

/* =========================================
LOGIN USER
========================================= */
window.login = async () => {


    try {

        const email = el("authEmail")?.value.trim();
        const password = el("authPassword")?.value.trim();


        if (!email || !password) {
            alert("Enter email and password");
            return;
        }

   

        const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

 

        const user = userCredential.user;

        await user.reload();

       

        console.log(user.emailVerified);

        if (!user.emailVerified) {

            alert("Email Not Verified");

            if (el("verifyEmailText")) {
                el("verifyEmailText").innerHTML =
                    `<strong>${user.email}</strong>`;
            }

            showPage("verifyPage");
            return;
        }

       

        const profileDoc = await getDoc(
            doc(
                db,
                "users",
                user.uid,
                "profile",
                "info"
            )
        );

  
if (profileDoc.exists()) {

    showPage("dashboardPage");


    return;

}

    } catch (error) {

        alert("ERROR");
        alert(error.code);
        alert(error.message);

        console.error(error);

    }
};
/* =========================================
LOGOUT
========================================= */

window.logout = async () => {

    try {

        await signOut(auth);

        readings = [];

        showPage("loginScreen");

    }
    catch (error) {

        console.error(error);

        alert(
            error.code +
            "\n" +
            error.message
        );

    }

};

/* =========================================
CHECK EMAIL VERIFICATION
========================================= */

window.checkVerification = async () => {

    try {

        const user =
            auth.currentUser;

        if (!user) {

            alert(
                "Please login again."
            );

            return;
        }

      onAuthStateChanged(auth, async (user) => {

    try {

 if (!user) {

    // If onboarding is visible, don't show login yet
    if (document.getElementById("onboardingScreen").style.display === "flex") {
        return;
    }

    showPage("loginScreen");
    return;

}
   await user.reload();

        // Email not verified
        if (!user.emailVerified) {

            if (el("verifyEmailText")) {
                el("verifyEmailText").innerHTML =
                    `<strong>${user.email}</strong>`;
            }

            showPage("verifyPage");
            return;
        }

        const profileDoc = await getDoc(
            doc(db, "users", user.uid, "profile", "info")
        );

        if (profileDoc.exists()) {

            showPage("dashboardPage");

            await loadProfile();
            await initializeDashboard();

        } else {

            showPage("profilePage");

        }

    } catch (error) {

        console.error(error);

        showPage("loginScreen");

    }

});
        alert(
            "Email verified successfully!"
        );

    }
    catch (error) {

        console.error(error);

        alert(
            error.code +
            "\n" +
            error.message
        );

    }

};

/* =========================================
AUTO CHECK EMAIL VERIFICATION
========================================= */

setInterval(async () => {

    try {

        const user =
            auth.currentUser;

        if (!user) return;

        if (user.emailVerified) return;

        await user.reload();

        if (!user.emailVerified) return;

        const profileDoc =
            await getDoc(
                doc(
                    db,
                    "users",
                    user.uid,
                    "profile",
                    "info"
                )
            );

        if (profileDoc.exists()) {

            showPage("dashboardPage");

            await loadProfile();
            await initializeDashboard();

        }
        else {

            showPage("profilePage");

        }

    }
    catch (error) {

        console.error(
            "Verification Check Error:",
            error
        );

    }

}, 5000);

/* =========================================
AUTH STATE LISTENER
========================================= */

onAuthStateChanged(
    auth,
    async (user) => {

        try {

           if (!user) {

    const firstLaunch =
        localStorage.getItem("healthSentinelOnboarding");

    if (!firstLaunch) {
        document.getElementById("onboardingScreen").style.display = "flex";
        return;
    }

    showPage("loginScreen");
    return;
}
            await user.reload();
console.log("EMAIL:", user.email);
console.log("VERIFIED:", user.emailVerified);

// TEMP TEST
if(false){

    showPage("verifyPage");

    return;
}
            const profileDoc =
                await getDoc(
                    doc(
                        db,
                        "users",
                        user.uid,
                        "profile",
                        "info"
                    )
                );

            if (
                profileDoc.exists()
            ) {

                showPage(
                    "dashboardPage"
                );

                await loadProfile();

                await initializeDashboard();

            }
            else {

                showPage(
                    "profilePage"
                );

            }

        }
        catch (error) {

            console.error(
                "Auth State Error:",
                error
            );

            showPage(
                "loginScreen"
            );

        }

    }
);

/* =========================================
UTILITY
========================================= */

window.disconnectDevice =
() => {

    const battery =
        el("battery");

    const signal =
        el("signal");

    const sync =
        el("sync");

    if (battery)
        battery.textContent =
            "--";

    if (signal)
        signal.textContent =
            "Disconnected";

    if (sync)
        sync.textContent =
            "--";

    alert(
        "Device Disconnected"
    );

};
/* =========================================
SAVE PROFILE
========================================= */

window.saveProfile = async () => {

    try {

        const profile = {

            name: el("patientName")?.value || "",

            age: el("age")?.value || "",

            gender: el("gender")?.value || "",

            emergency:
                el("emergencyNumber")?.value || "",

            highBP:
                el("bpPatient")?.value || 140,

            highSugar:
                el("sugarPatient")?.value || 180,

            lowBP:
                el("lowBPPatient")?.value || 90,

            lowSugar:
                el("lowSugarPatient")?.value || 70

        };

        await setDoc(

            doc(
                db,
                "users",
                auth.currentUser.uid,
                "profile",
                "info"
            ),

            profile

        );

        showPage("dashboardPage");

        await loadProfile();

        await initializeDashboard();

        alert(
            "Profile Saved Successfully"
        );

    }
    catch (error) {

        console.error(error);

        alert(
            error.code +
            "\n" +
            error.message
        );

    }

};

/* =========================================
EDIT PROFILE
========================================= */

window.editProfile = () => {

    showPage("profilePage");

};

/* =========================================
LOAD PROFILE
========================================= */

async function loadProfile() {

    try {

        const profileDoc =
            await getDoc(
                doc(
                    db,
                    "users",
                    auth.currentUser.uid,
                    "profile",
                    "info"
                )
            );

        if (!profileDoc.exists()) return;

        const profile =
            profileDoc.data();

        if (el("patientNameDisplay"))
          updateAll("patientNameDisplay", profile.name || "--");

        if (el("patientAgeDisplay"))
          updateAll("patientAgeDisplay", profile.age || "--");

        if (el("patientGenderDisplay"))
           updateAll("patientGenderDisplay", profile.gender || "--");

        if (el("familyNumber"))
           updateAll("familyNumber", profile.emergency || "--");

        if (el("userInfo"))
            updateAll("userInfo", auth.currentUser.email);

        if (el("greetingText"))
           updateAll("greetingText", `Welcome ${profile.name} 👋`);

    }
    catch (error) {

        console.error(
            "Load Profile Error:",
            error
        );

    }

}

/* =========================================
INITIALIZE DASHBOARD
========================================= */

async function initializeDashboard() {

    await loadReadings();

    if (
        readings.length === 0
    ) {

        if (el("bpValue"))
            el("bpValue").textContent =
                "--/--";

        if (el("sugarValue"))
            el("sugarValue").textContent =
                "--";

        if (el("spo2Value"))
            el("spo2Value").textContent =
                "--%";

        return;
    }

    loadVitals();

    loadHistoryTable();

    initializeCharts();

    analyzeHealth();

    updateAnalytics();

}

/* =========================================
LOAD VITALS
========================================= */

function loadVitals() {

    if (
        readings.length === 0
    ) return;

    const latest =
        readings[
            readings.length - 1
        ];

    if (el("bpValue"))
        el("bpValue").textContent =
            latest.bp;

    if (el("sugarValue"))
        el("sugarValue").textContent =
            latest.sugar;

    if (el("spo2Value"))
        el("spo2Value").textContent =
            latest.spo2 + "%";

}

/* =========================================
SAVE READING
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const saveBtn =
            el("saveBtn");

        if (!saveBtn) return;

        saveBtn.addEventListener(
            "click",
            async () => {

                try {

                    const bp =
                        el("bpInput")
                        ?.value
                        .trim();

                    const sugar =
                        Number(
                            el(
                                "sugarInput"
                            )?.value
                        );

                    const spo2 =
                        Number(
                            el(
                                "spo2Input"
                            )?.value
                        );

                    if (
                        !bp ||
                        !sugar ||
                        !spo2
                    ) {

                        alert(
                            "Enter all values"
                        );

                        return;
                    }

                    await addDoc(

                        collection(
                            db,
                            "users",
                            auth.currentUser.uid,
                            "readings"
                        ),

                        {
                            date:
                                new Date()
                                .toLocaleDateString(),

                            bp,
                            sugar,
                            spo2,

                            createdAt:
                                serverTimestamp()
                        }

                    );

                    alert(
                        "Reading Saved"
                    );

                    await loadReadings();

                }
                catch (error) {

                    console.error(
                        error
                    );

                    alert(
                        error.code +
                        "\n" +
                        error.message
                    );

                }

            }
        );

    }
);

/* =========================================
LOAD READINGS
========================================= */

async function loadReadings() {

    try {

        const q =
            query(

                collection(
                    db,
                    "users",
                    auth.currentUser.uid,
                    "readings"
                ),

                orderBy(
                    "createdAt",
                    "asc"
                )

            );

        const snapshot =
            await getDocs(q);

        readings = [];

        snapshot.forEach(
            (docSnap) => {

                readings.push(
                    docSnap.data()
                );

            }
        );

    }
    catch (error) {

        console.error(
            "Readings Error:",
            error
        );

    }

}
/* =========================================
ANALYTICS
========================================= */

function updateAnalytics() {

    if (readings.length === 0) return;

    const avgSugar =
        Math.round(
            readings.reduce(
                (a, b) => a + Number(b.sugar),
                0
            ) / readings.length
        );

    const avgSpo2 =
        Math.round(
            readings.reduce(
                (a, b) => a + Number(b.spo2),
                0
            ) / readings.length
        );

    const avgBP =
        readings[
            readings.length - 1
        ].bp;

    if (el("avgBP"))
        el("avgBP").textContent =
            avgBP;

    if (el("avgSugar"))
        el("avgSugar").textContent =
            avgSugar;

    if (el("avgSpo2"))
        el("avgSpo2").textContent =
            avgSpo2 + "%";

}

/* =========================================
CHARTS
========================================= */

function initializeCharts() {

    if (
        readings.length === 0 ||
        typeof Chart === "undefined"
    ) return;

    const labels =
        readings.map(
            r => r.date
        );

    const sugarData =
        readings.map(
            r => Number(r.sugar)
        );

    const spo2Data =
        readings.map(
            r => Number(r.spo2)
        );

    const systolicData =
        readings.map(
            r =>
                parseInt(
                    r.bp.split("/")[0]
                )
        );

   if (bpChart) {

    bpChart.destroy();

    bpChart = null;

}

if (glucoseChart) {

    glucoseChart.destroy();

    glucoseChart = null;

}

if (spo2Chart) {

    spo2Chart.destroy();

    spo2Chart = null;

}

const bpCanvas =
    el("bpChart") ||
    el("bpChartAnalytics");

const sugarCanvas =
    el("glucoseChart") ||
    el("glucoseChartAnalytics");

const spo2Canvas =
    el("spo2Chart") ||
    el("spo2ChartAnalytics");

    if (!bpCanvas ||
        !sugarCanvas ||
        !spo2Canvas) {
        return;
    }

    bpChart = new Chart(
        bpCanvas,
        {
            type: "line",
            data: {
                labels,
                datasets: [{
                    label: "BP",
                    data: systolicData,
                    borderWidth: 3,
                    tension: 0.4
                }]
            }
        }
    );

    glucoseChart =
        new Chart(
            sugarCanvas,
            {
                type: "line",
                data: {
                    labels,
                    datasets: [{
                        label: "Sugar",
                        data: sugarData,
                        borderWidth: 3,
                        tension: 0.4
                    }]
                }
            }
        );

    spo2Chart =
        new Chart(
            spo2Canvas,
            {
                type: "line",
                data: {
                    labels,
                    datasets: [{
                        label: "SpO₂",
                        data: spo2Data,
                        borderWidth: 3,
                        tension: 0.4
                    }]
                }
            }
        );

}

/* =========================================
TABLE
========================================= */

function loadHistoryTable() {

    const table =
        el("historyTable");

    if (!table) return;

    table.innerHTML = "";

    readings
        .slice()
        .reverse()
        .forEach(item => {

            const systolic =
                parseInt(
                    item.bp.split("/")[0]
                );

            const status =
                (
                    systolic > 140 ||
                    item.sugar > 180 ||
                    item.spo2 < 90
                )
                    ? "Abnormal"
                    : "Normal";

            table.innerHTML += `
            <tr>
                <td>${item.date}</td>
                <td>${item.bp}</td>
                <td>${item.sugar}</td>
                <td>${item.spo2}%</td>
                <td>${status}</td>
            </tr>
            `;

        });

}

/* =========================================
HEALTH ANALYSIS
========================================= */

function analyzeHealth() {

    if (
        readings.length === 0
    ) return;

    const latest =
        readings[
            readings.length - 1
        ];

    const systolic =
        parseInt(
            latest.bp.split("/")[0]
        );

    let risk = 0;

    if (systolic > 140)
        risk += 35;

    if (latest.sugar > 180)
        risk += 35;

    if (latest.spo2 < 92)
        risk += 30;

  updateRisk(risk);

    if (risk >= 70) {

        if (el("trendLabel"))
            el("trendLabel").textContent =
                "Critical";

        generateInsight(
            "Critical health parameters detected."
        );

        showEmergency();

    }
    else if (risk >= 35) {

        if (el("trendLabel"))
            el("trendLabel").textContent =
                "Moderate";

        generateInsight(
            "Health readings require monitoring."
        );

    }
    else {

        if (el("trendLabel"))
            el("trendLabel").textContent =
                "Stable";

        generateInsight(
            "Health indicators are healthy."
        );

    }

}

/* =========================================
AI INSIGHT
========================================= */

function generateInsight(message) {

    const insight =
        el("aiInsightText");

    if (insight)
        insight.innerHTML =
            message;

}

/* =========================================
EMERGENCY
========================================= */

window.showEmergency =
() => {

    const modal =
        el("emergencyModal");

    if (modal)
        modal.style.display =
            "flex";

};

window.closeEmergency =
() => {

    const modal =
        el("emergencyModal");

    if (modal)
        modal.style.display =
            "none";

};

/* =========================================
DEVICE CONNECT
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const connectBtn =
            el("connectBtn");

        if (!connectBtn)
            return;

        connectBtn.addEventListener(
            "click",
            () => {

                connectBtn.innerText =
                    "Connecting...";

                setTimeout(() => {

                    connectBtn.innerText =
                        "Connected";

                    if (el("battery"))
                        el("battery").textContent =
                            "96%";

                    if (el("signal"))
                        el("signal").textContent =
                            "Excellent";

                    if (el("sync"))
                        el("sync").textContent =
                            new Date()
                                .toLocaleTimeString();

                }, 2000);

            }
        );

    }
);

/* =========================================
BATTERY MONITOR
========================================= */

setInterval(() => {

    const battery =
        el("battery");

    if (!battery) return;

    const current =
        parseInt(
            battery.textContent
        );

    if (
        !isNaN(current) &&
        current > 20
    ) {

        battery.textContent =
            (current - 1) + "%";

    }

}, 60000);

/* =========================================
EXPORT REPORT
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const exportBtn =
            el("exportBtn");

        if (!exportBtn)
            return;

        exportBtn.addEventListener(
            "click",
            () => {

                const data =
                    JSON.stringify(
                        readings,
                        null,
                        2
                    );

                const blob =
                    new Blob(
                        [data],
                        {
                            type:
                                "application/json"
                        }
                    );

                const url =
                    URL.createObjectURL(
                        blob
                    );

                const a =
                    document.createElement(
                        "a"
                    );

                a.href = url;

                a.download =
                    "health-report.json";

                a.click();

                URL.revokeObjectURL(
                    url
                );

            }
        );

    }
);

console.log(
    "Health Sentinel Loaded Successfully"
);
/* =========================================
GENERATE AI REPORT
========================================= */

function buildAIReport() {

    if(readings.length === 0){

        return `
No health readings available.

Add readings to generate a report.
`;

    }

    const latest =
    readings[readings.length - 1];

    const systolic =
    parseInt(
        latest.bp.split("/")[0]
    );

    let report = "";

    report +=
    `Patient Health Report\n\n`;

    report +=
    `Blood Pressure: ${latest.bp}\n`;

    report +=
    `Blood Sugar: ${latest.sugar} mg/dL\n`;

    report +=
    `SpO₂: ${latest.spo2}%\n\n`;

    if(
        systolic > 140 ||
        latest.sugar > 180 ||
        latest.spo2 < 92
    ){

        report +=
        `⚠ Risk Detected\n\n`;

        report +=
        `Please consult a doctor and continue monitoring.\n`;

    }
    else{

        report +=
        `✅ Health Status Stable\n\n`;

        report +=
        `All readings are within safe limits.\n`;

    }

    return report;

}

/* =========================================
GENERATE REPORT BUTTON
========================================= */

document.addEventListener(
"DOMContentLoaded",
()=>{

    const reportBtn =
    document.getElementById(
        "generateReportBtn"
    );

    if(!reportBtn) return;

    reportBtn.addEventListener(
    "click",
    ()=>{

        const report =
        buildAIReport();

        alert(report);

    });

});

/* =========================================
LAST SYNC
========================================= */

function updateLastSync(){

    const syncLabel =
    document.getElementById(
        "lastSyncDate"
    );

    if(!syncLabel) return;

    syncLabel.textContent =
    new Date().toLocaleString();

}

/* =========================================
AUTO SYNC TIME
========================================= */

setInterval(()=>{

    updateLastSync();

},10000);

/* =========================================
SAFE DASHBOARD REFRESH
========================================= */

async function refreshDashboard(){

    try{

        await loadReadings();

        loadVitals();

        loadHistoryTable();

        initializeCharts();

        analyzeHealth();

        updateAnalytics();

        updateLastSync();

    }
    catch(error){

        console.error(
            "Dashboard Refresh Error:",
            error
        );

    }

}

/* =========================================
AUTO REFRESH
========================================= */

setInterval(async ()=>{

    if(!auth.currentUser)
    return;

    await refreshDashboard();

},30000);

/* =========================================
PAGE VISIBILITY REFRESH
========================================= */

document.addEventListener(
"visibilitychange",
async ()=>{

    if(
        document.visibilityState ===
        "visible"
    ){

        if(auth.currentUser){

            await refreshDashboard();

        }

    }

});

/* =========================================
STARTUP
========================================= */

document.addEventListener(
"DOMContentLoaded",
()=>{

    console.log(
        "Health Sentinel Ready"
    );

    updateLastSync();

});

/* =========================================
GLOBAL ERROR HANDLER
========================================= */
window.addEventListener("load", () => {

    // Always show onboarding first
    document.getElementById("onboardingScreen").style.display = "flex";

    // Hide all other pages
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("verifyPage").style.display = "none";
    document.getElementById("profilePage").style.display = "none";
    document.getElementById("dashboardPage").style.display = "none";

    document.querySelectorAll(".onboard-page").forEach(page => {
        page.classList.remove("active");
    });

    document.getElementById("page1").classList.add("active");

});
/* =========================================
PROMISE ERROR HANDLER
========================================= */

window.addEventListener(
"unhandledrejection",
(event)=>{

    console.error(
        "Unhandled Promise:",
        event.reason
    );

});
/* =========================================
FORCE LOGIN SCREEN ON FIRST LOAD
========================================= */

window.addEventListener(
"load",
()=>{

    console.log(
        "Application Loaded"
    );

});

/* =========================================
RESET UI
========================================= */

function resetUI(){

    const bp =
    document.getElementById(
        "bpInput"
    );

    const sugar =
    document.getElementById(
        "sugarInput"
    );

    const spo2 =
    document.getElementById(
        "spo2Input"
    );

    if(bp) bp.value = "";
    if(sugar) sugar.value = "";
    if(spo2) spo2.value = "";

}

/* =========================================
AFTER SAVE READING
========================================= */

async function afterReadingSaved(){

    resetUI();

    await refreshDashboard();

}

/* =========================================
SAFE PAGE DISPLAY
========================================= */

window.showLoginScreen = ()=>{

    showPage(
        "loginScreen"
    );

};

window.showProfileScreen = ()=>{

    showPage(
        "profilePage"
    );

};

window.showDashboardScreen = ()=>{

    showPage(
        "dashboardPage"
    );

};

window.showVerificationScreen = ()=>{

    showPage(
        "verifyPage"
    );

};

/* =========================================
FIREBASE SESSION CHECK
========================================= */

async function checkCurrentSession(){

    try{

        const user =
        auth.currentUser;

        if(!user){

            showLoginScreen();

            return;
        }

        await user.reload();

        console.log(
            "Current User:",
            user.email
        );

        console.log(
            "Verified:",
            user.emailVerified
        );

    }
    catch(error){

        console.error(
            error
        );

    }

}

/* =========================================
RUN SESSION CHECK
========================================= */

setTimeout(()=>{

    checkCurrentSession();

},2000);

/* =========================================
CLEAR LOCAL CACHE
========================================= */

window.clearHealthCache = ()=>{

    readings = [];

    console.log(
        "Cache Cleared"
    );

};

/* =========================================
FORCE LOGOUT
========================================= */

window.forceLogout =
async ()=>{

    try{

        await signOut(auth);

        location.reload();

    }
    catch(error){

        console.error(error);

    }

};

/* =========================================
VERSION
========================================= */

console.log(
"Health Sentinel v1.0 Ready"
);
/* =========================================
ONBOARDING
========================================= */

function hideAllOnboardingPages() {

    document.querySelectorAll(".onboard-page").forEach(page => {
        page.classList.remove("active");
    });

}

window.nextPage = function(page) {

    hideAllOnboardingPages();

    document
        .getElementById("page" + page)
        .classList.add("active");

}

window.previousPage = function(page) {

    hideAllOnboardingPages();

    document
        .getElementById("page" + page)
        .classList.add("active");

}

window.skipOnboarding = function() {

    localStorage.setItem(
        "healthSentinelOnboarding",
        "done"
    );

    document.getElementById(
        "onboardingScreen"
    ).style.display = "none";

    showPage("loginScreen");

}

window.finishOnboarding = function () {

    document.getElementById("onboardingScreen").style.display = "none";

    showPage("loginScreen");

};
window.nextPage = function(page){

    document.querySelectorAll(".onboard-page")
    .forEach(p => p.classList.remove("active"));

    document
        .getElementById("page"+page)
        .classList.add("active");

};

window.previousPage = function(page){

    document.querySelectorAll(".onboard-page")
    .forEach(p => p.classList.remove("active"));

    document
        .getElementById("page"+page)
        .classList.add("active");

};

window.skipOnboarding = function () {

    document.getElementById("onboardingScreen").style.display = "none";

    showPage("loginScreen");

};

window.finishOnboarding = function(){

    localStorage.setItem(
        "healthSentinelOnboarding",
        "true"
    );

    document.getElementById(
        "onboardingScreen"
    ).style.display="none";

    showPage("loginScreen");

};
/* =========================================================
HEALTH SENTINEL PRO DASHBOARD
PART 1
========================================================= */

/* -----------------------------
SIDEBAR TOGGLE
----------------------------- */

document.addEventListener("DOMContentLoaded", () => {

    const menuBtn = document.querySelector(".menu-btn");
    const sidebar = document.querySelector(".sidebar");

    if (menuBtn && sidebar) {

        menuBtn.addEventListener("click", () => {

            sidebar.classList.toggle("collapsed");

        });

    }

});

/* -----------------------------
SEARCH BAR
----------------------------- */

document.addEventListener("DOMContentLoaded", () => {

    const search = document.querySelector(".search-box");

    if (!search) return;

    search.addEventListener("keyup", function () {

        const value = this.value.toLowerCase();

        const rows = document.querySelectorAll("#historyTable tr");

        rows.forEach(row => {

            row.style.display =
                row.innerText.toLowerCase().includes(value)
                ? ""
                : "none";

        });

    });

});

/* -----------------------------
UPDATE DUPLICATE ELEMENTS
----------------------------- */

function updateAll(id, value) {

    document.querySelectorAll(`#${id}`).forEach(el => {

        el.textContent = value;

    });

}

/* -----------------------------
OVERRIDE PROFILE DISPLAY
----------------------------- */

async function updateDashboardProfile(profile) {

    updateAll("patientNameDisplay", profile.name || "--");

    updateAll("patientAgeDisplay", profile.age || "--");

    updateAll("patientGenderDisplay", profile.gender || "--");

    updateAll("familyNumber", profile.emergency || "--");

    updateAll("greetingText", `Welcome ${profile.name}`);

}

/* -----------------------------
LIVE CLOCK
----------------------------- */

setInterval(() => {

    updateAll(

        "lastSyncDate",

        new Date().toLocaleString()

    );

}, 1000);

/* -----------------------------
CARD ANIMATION
----------------------------- */

function animateCards() {

    document.querySelectorAll(

        ".metric-card,.analytics-card,.small-card,.chart-card"

    ).forEach((card, index) => {

        card.style.opacity = "0";

        card.style.transform = "translateY(20px)";

        setTimeout(() => {

            card.style.transition = ".5s";

            card.style.opacity = "1";

            card.style.transform = "translateY(0px)";

        }, index * 100);

    });

}

window.addEventListener("load", animateCards);

/* -----------------------------
CONNECT BUTTON EFFECT
----------------------------- */

document.addEventListener("DOMContentLoaded", () => {

    const connectBtn = document.getElementById("connectBtn");

    if (!connectBtn) return;

    connectBtn.addEventListener("click", () => {

        connectBtn.disabled = true;

        connectBtn.innerHTML = "Connecting...";

        setTimeout(() => {

            connectBtn.innerHTML = "Connected";

            connectBtn.style.background = "#10b981";

        }, 2000);

    });

});

console.log("Health Sentinel Pro Dashboard Part 1 Loaded");
function updateRisk(value) {

    updateAll("riskScore", value + "%");

}
/* ==============================
SIDEBAR NAVIGATION
============================== */

window.showSection = function(sectionId) {

    // Hide all sections
    document.querySelectorAll(".dashboard-section").forEach(section => {

        section.style.display = "none";

    });

    // Show selected section
    const selected = document.getElementById(sectionId);

    if (selected) {

        selected.style.display = "block";
        
setTimeout(() => {

    initializeCharts();

},100);
    }
    

    // Update active menu
    document.querySelectorAll(".sidebar a").forEach(link => {

        link.classList.remove("active");

    });

    const activeLink = document.querySelector(
        `.sidebar a[onclick="showSection('${sectionId}')"]`
    );

    if (activeLink) {

        activeLink.classList.add("active");

    }

};
window.toggleSidebar = function () {

    const sidebar = document.querySelector(".sidebar");

    const overlay = document.getElementById("mobileOverlay");

    sidebar.classList.toggle("open");

    overlay.classList.toggle("show");

};
