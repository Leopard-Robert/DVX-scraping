import scrapeData from '../data/supreme-tuning-master.json' with { type: 'json' };
import fs from "fs";

function getTypeList() {
    const types = scrapeData.types;
    return types;
}

function getStageList() {
    const stages = scrapeData.stages;
    return stages;
}

function getBrandList() {
    const brands = scrapeData.brands;
    return brands;
}

function getModelList() {
    const models = scrapeData.models;
    return models;
}

function getEngineList() {
    const engines = scrapeData.engines;
    return engines;
}

export function extractPeriod() {
    for (const engine of scrapeData.engines) {

        //optional normalization

        engine.name = nomalizeString(engine.name);


        const isContainYear = engine.typeName.match(/(\d{4})/);
        if (!isContainYear) {
            engine.startYear = null;
            engine.endYear = "present";
            continue;
        }
        const isContainPeriod = engine.typeName.match(/(\d{4}).*?(\d{4})/);
        if (isContainPeriod) {
            engine.startYear = isContainPeriod[1];
            engine.endYear = isContainPeriod[2];
            continue;
        }
        const isEndYear = engine.typeName.match(/->\s*(\d{4})/);
        if (isEndYear) {
            engine.startYear = null;
            engine.endYear = isEndYear[1];
            continue;
        }
        
        engine.startYear = isContainYear[1];
        engine.endYear = "present";
    }
}

function nomalizeString(str) {
    return str.replace(/JUST ADDED!|DEVELOPMENT/gi, "").trim();
}

function saveData() {
    fs.writeFileSync('supreme-tuning-master.json', JSON.stringify(scrapeData, null, 2));
    console.log(`💾 Data saved to supreme-tuning-master.json`);
}

extractPeriod();
saveData();