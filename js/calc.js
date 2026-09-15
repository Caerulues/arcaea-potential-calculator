function calcA() {
    var calcNote = parseInt(document.getElementById('calcNote').value);
    var calcScoreA = parseInt(document.getElementById('calcScoreA').value);
    var calcFar = parseInt(document.getElementById('calcFar').value);
    var calcMax = parseInt(document.getElementById('calcMax').value);
    if (!isNaN(calcNote) && !isNaN(calcScoreA)) {
        calcFar = 2 * calcNote - Math.floor((calcScoreA + 1) / (1e7 / calcNote / 2));
        calcMax = calcScoreA - Math.floor((2 * calcNote - calcFar) * (1e7 / calcNote / 2));
        document.getElementById('calcFar').value = calcFar.toString();
        document.getElementById('calcMax').value = calcMax.toString();
    } else if (!isNaN(calcNote) && !isNaN(calcFar) && !isNaN(calcMax)) {
        calcScoreA = calcMax + Math.floor((2 * calcNote - calcFar) * (1e7 / calcNote / 2));
        document.getElementById('calcScoreA').value = calcScoreA.toString();
    }
}

function calcB() {
    var calcConst = parseFloat(document.getElementById('calcConst').value);
    var calcScoreB = parseInt(document.getElementById('calcScoreB').value);
    var calcResult = parseFloat(document.getElementById('calcResult').value);
    var clearType = Number(document.getElementById('calcClearType').value);
    var reward = clearReward(clearType);
    if (!isNaN(calcConst) && !isNaN(calcScoreB)) {
        calcResult = scorePotential(calcConst, calcScoreB, clearType);
        calcResult = Math.round(calcResult * 100000) / 100000;
        document.getElementById('calcResult').value = calcResult.toString();
    } else if (!isNaN(calcConst) && !isNaN(calcResult)) {
        if (calcResult >= calcConst + 2 + reward) calcScoreB = 10000000;
        else if (calcResult >= calcConst + 1 + reward) calcScoreB = (calcResult - calcConst - 1 - reward) * 200000 + 9800000;
        else calcScoreB = (calcResult - calcConst - reward) * 300000 + 9500000;
        calcScoreB = Math.round(calcScoreB);
        document.getElementById('calcScoreB').value = calcScoreB.toString();
    } else if (!isNaN(calcResult) && !isNaN(calcScoreB)) {
        if (calcScoreB >= 10000000) calcConst = calcResult - 2 - reward;
        else if (calcScoreB >= 9800000) calcConst = calcResult - 1 - (calcScoreB - 9800000) / 200000 - reward;
        else calcConst = calcResult - (calcScoreB - 9500000) / 300000 - reward;
        calcConst = Math.round(calcConst * 10) / 10;
        document.getElementById('calcConst').value = calcConst.toString();
    }
}
