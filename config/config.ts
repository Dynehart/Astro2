const prefix = '.'
const SFAcorp = "968599292317151362"

//These arrays all need to be indexed with the same corps at the same indexes. From left to right: Spfl, Ender, BMC, WC, DS, SOL, YAL, C55. Further corps need to be added to the right
const corpRoles = ["968599292522680353", "968599292522680355", "968599292522680352", "968599292522680354", "968599292522680351", "968599292489113679", "968599292489113678", "968599292489113676"]
const Corpnames = [{ "name": "Spacefleet", "shortname": "SPFL" }, { "name": "Ender", "shortname": "ENDER" }, { "name": "Black Mirror Co", "shortname": "BMC" }, { "name": "WinterComes", "shortname": "WC" }, { "name": "Deadspace", "shortname": "DS" }, { "name": "Solysis", "shortname": "SOL" }, { "name": "яко лютеница", "shortname": "YAL" }, { "name": "Canada55", "shortname": "C55" }]
const botchannels = ["968599293629972578", "968599295748112455", "968599299044823135", "968599299044823136", "968599299044823139"]
const welcomechannel = "968599293432848435"
const logchannel = "968599299044823136"
const auditlogchannel = "968599299044823137"

const retiredrole = "968599292468146202"
const representtiverole = "968599292468146203"
const memberrole = "968599292489113672"
const captainRole = "968599292522680357"
const GreeterRole = "968599292317151370"
const coordRole = "968599292522680358"
const adminRole = "968599292556242984"
const DevRole = "968604230812315738"

//from left to right: RS3, RS4, RS5, RS6, RS7, RS8, RS9, RS10, RS11
const rschannels: { regular: string, dark?: string }[] = [{ regular: "968599294678556763" }, { regular: "968599294678556764" }, { regular: "968599294678556765" }, { regular: "968599294678556766" }, { regular: "968599294678556767", dark: "1204723280351858719" }, { regular: "968599294678556768", dark: "1204723300669067284" }, { regular: "968599294678556769", dark: "1204723318020771861" }, { regular: "968599294678556770", dark: "1204723338765930566" }, { regular: "968599294678556771", dark: "1204723360576307250" }]
const rslevels = [3, 4, 5, 6, 7, 8, 9, 10, 11]
const rsroles: { regular: string, dark?: string }[] = [{ regular: "968599292342308911" }, { regular: "968599292342308912" }, { regular: "968599292342308913" }, { regular: "968599292342308914" }, { regular: "968599292371673119", dark: "1204728347993710603" }, { regular: "968599292371673120", dark: "1204728379568558091" }, { regular: "968599292371673121", dark: "1204728397436030976" }, { regular: "968599292371673122", dark: "1204728414473293864" }, { regular: "968599292371673123", dark: "1204728431540174848" }]
const maxRSsize = { regular: 4, dark: 3 }
const AFKTimeout = 3600000
const runlogchannel = "968599294909222964"

const wsTypes = [{ "name": "Competitive", "shortname": "comp" }, { "name": "Casual", "shortname": "casual" }, { "name": "Ultra-Casual", "shortname": "uc" }]
const WSRoles = ["968599292392665167", "968599292522680355", "968599292392665166", "968599292426215465", "968599292392665165", "968599292392665162", "968599292392665164", "1108725962721468517"] //Indexed the same as corpRoles: from left to right: Spfl, Ender, BMC, WC, DS, SOL, YAL, C55.
const allWSrole = "968599292489113670"
const rosterBuddiesRole = "968599292317151369"
const signupchannel = "968599295408361486"
const mustReadChannel = "968599295408361484"
const rosterbuildingchannel = "968599295748112455"

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
    auditlogchannel,
    maxRSsize
}
