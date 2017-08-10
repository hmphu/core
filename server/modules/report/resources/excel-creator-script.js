var _ = require('lodash'),
    path = require('path'),
    XLSX = require('xlsx'),
    fs = require('fs-extra'),
    moment = require('moment'),
    config = require(path.resolve('./config/config'));


var createXlsxFile = function(idOwner, columns, tickets, callback){
    // init var
    var file_name = moment().unix(),
        userReportFolder = `assets/export/${idOwner}`,
        xlsxFile = `${userReportFolder}/${file_name}.xlsx`;

    // create folder if not existed
    if (!fs.existsSync(userReportFolder)) {
        fs.mkdirSync(userReportFolder);
    }

    function datenum(v, date1904) {
        if(date1904) v+=1462;
        var epoch = Date.parse(v);
        return (epoch - new Date(Date.UTC(1899, 11, 30))) / (24 * 60 * 60 * 1000);
    }

    function sheet_from_array_of_objects(tickets, opts) {
        var ws      = {},
            range   = {s: {c:10000000, r:10000000}, e: {c:0, r:0 }},
            cell,
            cell_ref,
            R_loc = 0,
            C_loc = 0;

        // Add Header Row
        columns.forEach(column => {
            cell = { v: column };
            cell.t = 's';
            cell_ref = XLSX.utils.encode_cell({c: C_loc,r: R_loc});
            ws[cell_ref] = cell;
            range.e.c++;
            C_loc++;
        });
        R_loc++;

        // Add rows and their cells
        for(var R = 0; R != tickets.length; R++) {
            C_loc = 0;
            //var filter_columns = data.renderReportData(req, tickets[R], data.columns),
            var filter_columns = tickets[R],
                row = Object.keys(filter_columns || {});

            row.forEach(key=>{
                var value = filter_columns[key];
                if(range.s.r > R) range.s.r = R;
                if(range.s.c > C_loc) range.s.c = C_loc;
                if(range.e.r < R) range.e.r = R;
                if(range.e.c < C_loc) range.e.c = C_loc;

                cell = { v: filter_columns[key] };

                if(cell.v != null) {
                    cell_ref = XLSX.utils.encode_cell({c: C_loc,r: R_loc});
                    if(typeof cell.v === 'number') cell.t = 'n';
                    else if(typeof cell.v === 'boolean') cell.t = 'b';
                    else if(cell.v instanceof Date) {
                        cell.t = 'n'; cell.z = XLSX.SSF._table[14];
                        cell.v = datenum(cell.v);
                    }
                    else cell.t = 's';

                    ws[cell_ref] = cell;
                }
                range.e.c++;
                C_loc++;
            });
            range.e.r++;
            R_loc++;
        }
        if(range.s.c < 10000000) ws['!ref'] = XLSX.utils.encode_range(range);
        return ws;
    }
    
    function Workbook() {
        if(!(this instanceof Workbook)) return new Workbook();
        this.SheetNames = [];
        this.Sheets = {};
    }

    /* original data */
    var ws_name = "Report",
        wb = new Workbook(),
        ws = sheet_from_array_of_objects(tickets);

    /* add worksheet to workbook */
    wb.SheetNames.push(ws_name);
    wb.Sheets[ws_name] = ws;

    // write file
    XLSX.writeFile(wb, xlsxFile);

    XLSX = ws = tickets = wb = undefined;
    
    // return path of data
    callback(null, {
        //path_folder: userReportFolder,
        name: file_name + ".xlsx"
    });
};


process.on( 'message', function ( data ) {
    createXlsxFile(data.idOwner, data.columns, data.tickets, (err, result) => {
        process.send( {
            error : err,
            result : result
        });
    });
});
