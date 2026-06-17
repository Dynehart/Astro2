import { createPool, Pool, RowDataPacket, } from 'mysql2';
let pool: Pool;

function initDB() {
    //Initiate the database connection - gets called on bot startup
    pool = createPool(
        {
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT!),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            connectTimeout: 100000
        }
    )
    pool.on("error", () => { })
}

async function queryDB(query: string) {
    //Send a query to the DB. The caller must escape input values themselves.
    return new Promise<RowDataPacket[]>((resolve, reject) => {
        pool.query(query, function (err, result: RowDataPacket[]) {
            if (err) {
                console.log(err);
                reject(err)
            }
            else {
                resolve(result)
            }
        })
    })
}

export {
    initDB,
    queryDB
}
