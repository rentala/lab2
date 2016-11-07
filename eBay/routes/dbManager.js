/**
 * Created by Rentala on 18-10-2016.
 */
var dbContext;
function dbManager(config) {
    switch(config.db)   {
        case "mysql":
            dbContext ="mysql";
            break;
        case "mongodb":
            dbContext ="mongodb";
            break;
    }
}
function getDbContext() {
    return dbContext;
}

module.exports = {
    dbManager : dbManager,
    getDbContext : getDbContext
}



