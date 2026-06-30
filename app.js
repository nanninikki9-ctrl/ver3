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
    limit,
    orderBy,
    serverTimestamp,
    deleteDoc
}
from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

console.log("Health Sentinel Started");

/* =========================================
GLOBAL VARIABLES
========================================= */

let bpChart = null;
let glucoseChart = null;
let spo2Chart = null;

let bpChartAnalytics = null;
let glucoseChartAnalytics = null;
let spo2ChartAnalytics = null;

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

    await loadProfile();

    await initializeDashboard();

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
/*=========================================
SAVE MANUAL READING
=========================================*/

window.saveManualReading = async function () {

    try {

        const user = auth.currentUser;

        if (!user) {

            alert("Please login first.");

            return;

        }

        const systolic =
            Number(el("manualSystolic").value);

        const diastolic =
            Number(el("manualDiastolic").value);

        const sugar =
            Number(el("manualSugar").value);

        const spo2 =
            Number(el("manualSpo2").value);

        const heartRate =
            Number(el("manualHeartRate").value);

        const temperature =
            Number(el("manualTemp").value);

        const notes =
            el("manualNotes").value.trim();

        if (

            !systolic ||

            !diastolic ||

            !sugar ||

            !spo2

        ) {

            alert("Please complete all required fields.");

            return;

        }

        let risk = "Low";

        if (

            systolic >= 140 ||

            sugar >= 180 ||

            spo2 < 92

        ) {

            risk = "High";

        }

        else if (

            systolic >= 130 ||

            sugar >= 140 ||

            spo2 < 95

        ) {

            risk = "Medium";

        }

        await addDoc(

            collection(

                db,

                "users",

                user.uid,

                "readings"

            ),

            {

                bp:
                    systolic +
                    "/" +
                    diastolic,

                systolic,

                diastolic,

                sugar,

                spo2,

                heartRate,

                temperature,

                notes,

                risk,

                timestamp:
                    serverTimestamp()

            }

        );

      alert("Reading saved successfully.");

clearManualEntry();

await loadReadings();

await loadRecentReadings();

loadVitals();

initializeCharts();

updateAnalytics();

analyzeHealth();

    }

    catch (error) {

        console.error(error);

        alert(error.message);

    }

};
/*=========================================
CLEAR FORM
=========================================*/

function clearManualEntry() {

    el("manualSystolic").value = "";

    el("manualDiastolic").value = "";

    el("manualSugar").value = "";

    el("manualSpo2").value = "";

    el("manualHeartRate").value = "";

    el("manualTemp").value = "";

    el("manualNotes").value = "";

}
/*=========================================
LOAD RECENT READINGS
=========================================*/

window.loadRecentReadings = async function () {

    try {

        const user = auth.currentUser;

        if (!user) return;

        const tbody =
            el("recentReadingsTable");

        if (!tbody) return;

        tbody.innerHTML = "";

        const q = query(

            collection(
                db,
                "users",
                user.uid,
                "readings"
            ),
orderBy(
    "timestamp",
    "desc"
),

limit(5)

        );

        const snapshot =
            await getDocs(q);

        if (snapshot.empty) {

            tbody.innerHTML = `

                <tr>

                    <td colspan="8"
                        class="empty-history">

                        No readings available.

                    </td>

                </tr>

            `;

            return;

        }

        snapshot.forEach(docItem => {

            const data =
                docItem.data();

            const date =
                data.timestamp
                ? data.timestamp
                      .toDate()
                      .toLocaleDateString()
                : "--";

            const time =
                data.timestamp
                ? data.timestamp
                      .toDate()
                      .toLocaleTimeString([],{
                          hour:"2-digit",
                          minute:"2-digit"
                      })
                : "--";

            let riskClass = "risk-low";

            if(data.risk==="Medium")
                riskClass="risk-medium";

            if(data.risk==="High")
                riskClass="risk-high";

            tbody.innerHTML += `

            <tr>

                <td>${date}</td>

                <td>${time}</td>

                <td>${data.bp}</td>

                <td>${data.sugar}</td>

                <td>${data.spo2}%</td>

                <td>${data.heartRate || "--"}</td>

                <td>

                    <span class="${riskClass}">

                        ${data.risk}

                    </span>

                </td>

                <td>

                    <div class="history-actions">

                        <button

                            class="icon-btn view-btn"

                            onclick="viewReading('${docItem.id}')">

                            👁

                        </button>

                        <button

                            class="icon-btn edit-btn"

                            onclick="editReading('${docItem.id}')">

                            ✏

                        </button>

                        <button

                            class="icon-btn delete-btn"

                            onclick="deleteReading('${docItem.id}')">

                            🗑

                        </button>

                    </div>

                </td>

            </tr>

            `;

        });

    }

    catch(error){

        console.error(error);

    }

};
/*=========================================
VIEW READING
=========================================*/

window.viewReading = async function(readingId){

    const user = auth.currentUser;

    if(!user) return;

    const snap = await getDoc(

        doc(

            db,

            "users",

            user.uid,

            "readings",

            readingId

        )

    );

    if(!snap.exists())

        return;

    const r = snap.data();

    el("modalBP").textContent = r.bp;

    el("modalSugar").textContent = r.sugar + " mg/dL";

    el("modalSpo2").textContent = r.spo2 + "%";

    el("modalHeartRate").textContent =
        (r.heartRate || "--") + " BPM";

    el("modalTemp").textContent =
        (r.temperature || "--") + " °C";

    el("modalRisk").textContent = r.risk;

    el("modalNotes").textContent =
        r.notes || "No Notes";

    el("readingModal").style.display =
        "flex";

};
window.closeReadingModal = function(){

    el("readingModal").style.display="none";

};

/*=========================================
DELETE READING
=========================================*/

window.deleteReading = async function(readingId){

    try{

        if(!confirm("Delete this reading?"))

            return;

        const user = auth.currentUser;

        await deleteDoc(

            doc(

                db,

                "users",

                user.uid,

                "readings",

                readingId

            )

        );

        loadRecentReadings();

        loadReadings();

    }

    catch(err){

        console.error(err);

        alert(err.message);

    }

};

/*=========================================
EDIT READING
=========================================*/

window.editReading = async function(readingId){

    try{

        const user = auth.currentUser;

        const ref = doc(

            db,

            "users",

            user.uid,

            "readings",

            readingId

        );

        const snap = await getDoc(ref);

        if(!snap.exists())

            return;

        const r = snap.data();

        const bp = r.bp.split("/");

        el("manualSystolic").value = bp[0];

        el("manualDiastolic").value = bp[1];

        el("manualSugar").value = r.sugar;

        el("manualSpo2").value = r.spo2;

        el("manualHeartRate").value = r.heartRate || "";

        el("manualTemp").value = r.temperature || "";

        el("manualNotes").value = r.notes || "";

        await deleteDoc(ref);

        window.scrollTo({

            top:0,

            behavior:"smooth"

        });

    }

    catch(err){

        console.error(err);

    }

};
/* =========================================
UTILITY
========================================= */
window.connectDevice = async function () {

    if (!navigator.bluetooth) {

        alert("Bluetooth is not supported on this browser.");

        return;

    }

    try {

        const device = await navigator.bluetooth.requestDevice({

            acceptAllDevices: true,

            optionalServices: [
                "battery_service"
            ]

        });

        const server = await device.gatt.connect();

        // Save globally
        window.connectedDevice = device;

        // Device Name
        updateAll(
            "deviceName",
            device.name || "Unknown Device"
        );

        // Status
        updateAll(
            "signal",
            "Connected"
        );

        // Last Sync
        updateAll(
            "sync",
            new Date().toLocaleTimeString()
        );

        // Battery
        updateAll(
            "battery",
            "Connected"
        );

        // Button
        const btn = document.getElementById("connectBtn");

        if(btn){

            btn.innerHTML="Connected";

            btn.disabled=true;

        }

        alert(
            "Connected to " +
            (device.name || "Bluetooth Device")
        );

    }

    catch(error){

        console.error(error);

        alert(error.message);

    }

}
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

    await loadRecentReadings();

    if (readings.length === 0) {

        updateAll("bpValue", "--/--");
        updateAll("sugarValue", "--");
        updateAll("spo2Value", "--%");

        return;

    }

    loadVitals();

    initializeCharts();

    analyzeHealth();

    updateAnalytics();

}
/* =========================================
LOAD VITALS
========================================= */
function loadVitals() {

    if (readings.length === 0)
        return;

    const latest =
        readings[readings.length-1];

    updateAll(
        "bpValue",
        latest.bp
    );

    updateAll(
        "sugarValue",
        latest.sugar
    );

    updateAll(
        "spo2Value",
        latest.spo2 + "%"
    );

    if(el("liveBPValue"))
        el("liveBPValue").textContent =
        latest.bp;

    if(el("liveSugarValue"))
        el("liveSugarValue").textContent =
        latest.sugar;

    if(el("liveSpo2Value"))
        el("liveSpo2Value").textContent =
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

        if (!auth.currentUser) {

            console.log("No user logged in");

            return;

        }

        console.log("UID:", auth.currentUser.uid);

        const q = query(

            collection(
                db,
                "users",
                auth.currentUser.uid,
                "readings"
            ),

            orderBy("timestamp", "asc")

        );

        const snapshot = await getDocs(q);

        console.log("Documents Found:", snapshot.size);

        readings = [];

        snapshot.forEach((docSnap) => {

            const data = docSnap.data();

            console.log("Reading:", data);

            readings.push(data);

        });

        console.log("Total Readings Loaded:", readings.length);

    }

    catch (error) {

        console.error("loadReadings Error:", error);

    }

}
/* =========================================
ANALYTICS
========================================= */

function updateAnalytics() {

    if (readings.length === 0) return;

    const sugars = readings.map(r => Number(r.sugar));
    const spo2s = readings.map(r => Number(r.spo2));
    const systolics = readings.map(r => Number(r.systolic));

    const avgBP =
        Math.round(
            systolics.reduce((a,b)=>a+b,0) /
            systolics.length
        );

    const avgSugar =
        Math.round(
            sugars.reduce((a,b)=>a+b,0) /
            sugars.length
        );

    const avgSpo2 =
        Math.round(
            spo2s.reduce((a,b)=>a+b,0) /
            spo2s.length
        );

    el("avgBP").textContent =
        avgBP + " mmHg";

    el("avgSugar").textContent =
        avgSugar;

    el("avgSpo2").textContent =
        avgSpo2 + "%";

    el("totalReadings").textContent =
        readings.length;

    const normal =
        readings.filter(r=>r.risk==="Low").length;

    const abnormal =
        readings.length-normal;

    el("normalReadings").textContent =
        normal;

    el("abnormalReadings").textContent =
        abnormal;

    el("highestBP").textContent =
        Math.max(...systolics);

    el("lowestBP").textContent =
        Math.min(...systolics);

    el("highestSugar").textContent =
        Math.max(...sugars);

    el("lowestSugar").textContent =
        Math.min(...sugars);

    el("lowestSpo2").textContent =
        Math.min(...spo2s) + "%";

    el("bpProgress").value =
        Math.min(avgBP/140*100,100);

    el("sugarProgress").value =
        Math.min(avgSugar/180*100,100);

    el("spo2Progress").value =
        avgSpo2;

    let risk = 0;

    if(avgBP>140) risk+=35;
    if(avgSugar>180) risk+=35;
    if(avgSpo2<92) risk+=30;

    el("riskScoreAnalytics").textContent =
        risk + "%";
}

/* =========================================
CHARTS
========================================= */

function initializeCharts() {

    if (
        readings.length === 0 ||
        typeof Chart === "undefined"
    ) return;

   const labels = readings.map(r =>

    r.timestamp
        ? r.timestamp.toDate().toLocaleDateString()
        : "--"

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
        /* ============================
ANALYTICS CHARTS
============================ */

const bpAnalyticsCanvas =
    el("bpChartAnalytics");

if(bpAnalyticsCanvas){

    if(bpChartAnalytics)
        bpChartAnalytics.destroy();

    bpChartAnalytics =
    new Chart(bpAnalyticsCanvas,{

        type:"line",

        data:{

            labels,

            datasets:[{

                label:"Blood Pressure",

                data:systolicData,

                borderWidth:3,

                tension:0.4

            }]

        }

    });

}

const sugarAnalyticsCanvas =
    el("glucoseChartAnalytics");

if(sugarAnalyticsCanvas){

    if(glucoseChartAnalytics)
        glucoseChartAnalytics.destroy();

    glucoseChartAnalytics =
    new Chart(sugarAnalyticsCanvas,{

        type:"line",

        data:{

            labels,

            datasets:[{

                label:"Blood Sugar",

                data:sugarData,

                borderWidth:3,

                tension:0.4

            }]

        }

    });

}

const spo2AnalyticsCanvas =
    el("spo2ChartAnalytics");

if(spo2AnalyticsCanvas){

    if(spo2ChartAnalytics)
        spo2ChartAnalytics.destroy();

    spo2ChartAnalytics =
    new Chart(spo2AnalyticsCanvas,{

        type:"line",

        data:{

            labels,

            datasets:[{

                label:"SpO₂",

                data:spo2Data,

                borderWidth:3,

                tension:0.4

            }]

        }

    });

}

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

    await loadRecentReadings();

    loadVitals();

    initializeCharts();

    analyzeHealth();

    updateAnalytics();

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
/*=========================================
FILTER HISTORY
=========================================*/

window.filterHistory = function(){

    const search =
        el("historySearch")
        .value
        .toLowerCase();

    const risk =
        el("riskFilter")
        .value;

    document
        .querySelectorAll(
            "#recentReadingsTable tr"
        )
        .forEach(row=>{

            const text =
                row.innerText.toLowerCase();

            const rowRisk =
                row.innerText;

            const searchMatch =
                text.includes(search);

            const riskMatch =
                risk==="All" ||
                rowRisk.includes(risk);

            row.style.display =
                searchMatch &&
                riskMatch
                ? ""
                : "none";

        });

};

/*=========================================
PRINT
=========================================*/

window.printHistory=function(){

    window.print();

};

/*=========================================
EXPORT CSV
=========================================*/

window.exportHistoryCSV=function(){

    let csv=[];

    document
        .querySelectorAll(
            ".history-table tr"
        )
        .forEach(row=>{

            let cols=[];

            row.querySelectorAll(
                "th,td"
            ).forEach(col=>{

                cols.push(
                    '"' +
                    col.innerText
                    .replace(/"/g,'""') +
                    '"'
                );

            });

            csv.push(
                cols.join(",")
            );

        });

    const blob=
        new Blob(
            [csv.join("\n")],
            {
                type:"text/csv"
            }
        );

    const url=
        URL.createObjectURL(blob);

    const a=
        document.createElement("a");

    a.href=url;

    a.download=
        "Health_Readings.csv";

    a.click();

    URL.revokeObjectURL(url);

};
/*=========================================
VIEW FULL HISTORY
=========================================*/

window.viewAllHistory = async function(){

    el("historyModal").style.display="flex";

    await loadFullHistory();

};

window.closeHistoryModal=function(){

    el("historyModal").style.display="none";

};
/*=========================================
LOAD FULL HISTORY
=========================================*/

async function loadFullHistory(){

    try{

        const user = auth.currentUser;

        if(!user) return;

        const tbody = el("historyModalBody");

        tbody.innerHTML = "";

        const q = query(

            collection(
                db,
                "users",
                user.uid,
                "readings"
            ),

            orderBy(
                "timestamp",
                "desc"
            )

        );

        const snapshot = await getDocs(q);

        let total = 0;

        let sugarTotal = 0;

        let spo2Total = 0;

        let systolicTotal = 0;

        snapshot.forEach(docItem=>{

            const r = docItem.data();

            total++;

            sugarTotal += Number(r.sugar || 0);

            spo2Total += Number(r.spo2 || 0);

            systolicTotal += Number(r.systolic || 0);
            console.log(docItem.data());
            console.log("Readings Array:", readings);

            const date = r.timestamp ?

                r.timestamp
                .toDate()
                .toLocaleDateString()

                :

                "--";

            const time = r.timestamp ?

                r.timestamp
                .toDate()
                .toLocaleTimeString([],{

                    hour:"2-digit",

                    minute:"2-digit"

                })

                :

                "--";

            let badge="risk-low";

            if(r.risk==="Medium")
                badge="risk-medium";

            if(r.risk==="High")
                badge="risk-high";

            tbody.innerHTML += `

            <tr>

                <td>${date}</td>

                <td>${time}</td>

                <td>${r.bp}</td>

                <td>${r.sugar}</td>

                <td>${r.spo2}%</td>

                <td>${r.heartRate || "--"}</td>

                <td>

                    <span class="${badge}">

                        ${r.risk}

                    </span>

                </td>

            </tr>

            `;

        });

        el("totalReadings").textContent = total;

        el("avgSugar").textContent =

            total ?

            (sugarTotal/total).toFixed(1)

            :

            "--";

        el("avgSpo2").textContent =

            total ?

            (spo2Total/total).toFixed(1)+"%"

            :

            "--";

        el("avgBP").textContent =

            total ?

            Math.round(systolicTotal/total)

            :

            "--";

    }

    catch(err){

        console.error(err);

    }

}
/*=========================================
FILTER FULL HISTORY
=========================================*/

window.filterFullHistory=function(){

    const date=

        el("historyDateFilter").value;

    const risk=

        el("historyRiskFilter").value;

    const search=

        el("historySearchBox")

        .value

        .toLowerCase();

    document

        .querySelectorAll(

            "#historyModalBody tr"

        )

        .forEach(row=>{

            const txt=

                row.innerText

                .toLowerCase();

            const rowDate=

                row.cells[0].innerText;

            const rowRisk=

                row.cells[6].innerText;

            const matchSearch=

                txt.includes(search);

            const matchRisk=

                risk==="All" ||

                rowRisk.includes(risk);

            const matchDate=

                !date ||

                rowDate.includes(date);

            row.style.display=

                matchSearch &&

                matchRisk &&

                matchDate

                ?

                ""

                :

                "none";

        });

}
console.log("APP JS LOADED");


    alert("CONNECT FUNCTION CALLED");
window.connectDevice = function () {
};
document.addEventListener("DOMContentLoaded", () => {

    const btn = document.getElementById("connectBtn");

    console.log("Button:", btn);

    if (!btn) {

        alert("Connect button not found");

        return;

    }

    btn.onclick = async function () {

        alert("Button Clicked");

        console.log("Clicked");

        if (!navigator.bluetooth) {

            alert("Bluetooth not supported");

            return;

        }

        try {

            const device = await navigator.bluetooth.requestDevice({

                acceptAllDevices: true

            });

            alert(device.name || "Unnamed Device");

        }

        catch (e) {

            alert(e.message);

            console.error(e);

        }

    };

});
