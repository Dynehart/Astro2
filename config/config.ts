const prefix = '.'
const SFAcorp = "454867033729794069"

//These arrays all need to be indexed with the same corps at the same indexes. From left to right: Spfl, Ender, BMC, WC, DS, SOL, YAL, C55, SL. Further corps need to be added to the right
const corpRoles = ["471353432133861387", "704536599198957569", "471355539478020096", "592494094509670406", "545005992941715485", "878036266439020594", "771412515213148191", "934891670724546560", "1144081258943631432"]
const Corpnames = [{ "name": "Spacefleet", "shortname": "SPFL" }, { "name": "Ender", "shortname": "ENDER" }, { "name": "Black Mirror Co", "shortname": "BMC" }, { "name": "WinterComes", "shortname": "WC" }, { "name": "Deadspace", "shortname": "DS" }, { "name": "Solysis", "shortname": "SOL" }, { "name": "яко лютеница", "shortname": "YAL" }, { "name": "Canada55", "shortname": "C55" }, { "name": "Shrek Legion", "shortname": "SL" }]
const botchannels = ["520417476517953557", "455438948051976203", "790220818041798697", "606736666157383711", "790220277618311188"]
const welcomechannel = "520419411421560848"
const logchannel = "455438948051976203"
const auditlogchannel = "693599507333513366"

const retiredrole = "540982404689559573"
const representtiverole = "455938159935619092"
const memberrole = "454867698258673676"
const captainRole = "454867265909817345"
const GreeterRole = "842867300729487400"
const coordRole = "530438959537586215"
const adminRole = "468964957023895563"
const DevRole = "514265759279480847"

//from left to right: RS3, RS4, RS5, RS6, RS7, RS8, RS9, RS10, RS11
const rschannels: { regular: string, dark?: string }[] = [{ regular: "798228442138804274" }, { regular: "798228973720829983" }, { regular: "798229004549226566" }, { regular: "798229034600497212" }, { regular: "773652137955557416", dark: "1204723280351858719" }, { regular: "713832918295904367", dark: "1204723300669067284" }, { regular: "713832945689034832", dark: "1204723318020771861" }, { regular: "713832972133859348", dark: "1204723338765930566" }, { regular: "780154692248010812", dark: "1204723360576307250" }]
const rslevels = [3, 4, 5, 6, 7, 8, 9, 10, 11]
const rsroles: { regular: string, dark?: string }[] = [{ regular: "772599455681085470" }, { regular: "772599415751704578" }, { regular: "718264052962557952" }, { regular: "514779527457800196" }, { regular: "514779666947768320", dark: "1204728347993710603" }, { regular: "514779745142046749", dark: "1204728379568558091" }, { regular: "514779811751657472", dark: "1204728397436030976" }, { regular: "582562459706064904", dark: "1204728414473293864" }, { regular: "705734947553542185", dark: "1204728431540174848" }]
const AFKTimeout = 3600000
const runlogchannel = "797502406837534731"

const wsTypes = [{ "name": "Competitive", "shortname": "comp" }, { "name": "Casual", "shortname": "casual" }, { "name": "Ultra-Casual", "shortname": "uc" }]
const WSRoles = ["454867735969529857", "704537052334653511", "508290366672338965", "592495223603462195", "545006010629226506", "880533387406880838", "772597667711811594", "727269551930081401", "1154884581732909087"] //Indexed the same as corpRoles: from left to right: Spfl, Ender, BMC, WC, DS, SOL, YAL, C55.
const allWSrole = "592781800732885013"
const rosterBuddiesRole = "850107238327779358"
const signupchannel = "631901870767472671"
const mustReadChannel = "623755649888681984"
const rosterbuildingchannel = "667854754336210964"

const destinydamage = [0, 5000, 5500, 6000, 6600, 7300, 8000, 8800, 9700, 10500, 12000, 14000, 16000]
const blastHP = [0, 15000, 20000, 25000, 32000, 40000, 50000, 60000, 70000, 85000, 100000, 120000, 140000]
const areaHP = [0, 7000, 7500, 8000, 8500, 9000, 9500, 10000, 11000, 12000, 13000, 15000, 17000]
const TWSpeed = [1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2, 2.2, 2.4, 2.6]
const dispatchSpeed = [null, 240, 176, 130, 96, 70, 50, 36, 26, 18, 12]


export {
    rschannels,
    corpRoles,
    coordRole,
    prefix,
    AFKTimeout,
    rsroles,
    retiredrole,
    representtiverole,
    Corpnames,
    runlogchannel,
    SFAcorp,
    captainRole,
    botchannels,
    GreeterRole,
    adminRole,
    DevRole,
    WSRoles,
    wsTypes,
    signupchannel,
    memberrole,
    destinydamage,
    blastHP,
    areaHP,
    TWSpeed,
    dispatchSpeed,
    rslevels,
    allWSrole,
    rosterBuddiesRole,
    mustReadChannel,
    rosterbuildingchannel,
    welcomechannel,
    logchannel,
    auditlogchannel
}
