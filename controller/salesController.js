const eventEmitter = require('../utils/eventEmitter');
const admin = require('firebase-admin');
const serviceAccount = require('../config/fcm.json');
const salesorder = require("../models/sales");
const mongoose = require('mongoose');
const moment = require('moment');
// const {redisClient,isRedisConnected} = require('../config/redis')
var stock = require('../models/Stock_M');
const { all } = require("../routes/sales");
const redisClient = require('../config/redis');
const fs = require('fs').promises;
const path = require('path');
const fileSystem = require('fs');
const AWS=require('aws-sdk')
const puppeteer = require('puppeteer');
const dotenv = require('dotenv');
dotenv.config();

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey:process.env.SECRET_ACCESS_KEY,
    region: 'ap-south-1',
   
  });


// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function sendPushNotification(deviceToken, message) {
    const payload = {
      notification: {
        title: 'Order Rejected',
        body: message,
      },
    };
  
    try {
      // Send FCM notification
      const response = await admin.messaging().sendToDevice(deviceToken, payload);
      // Log success or error
      if (response.results && response.results.length > 0) {
        const firstResult = response.results[0];
        if (firstResult.error) {
          console.error('FCM notification failed:', firstResult.error);
        } else {
          console.log('FCM notification sent successfully:', response);
        }
      }
    } catch (error) {
      console.error('Error sending FCM notification:', error);
    }
  }
  

// Listen for 'OrderRejected' event
eventEmitter.on('OrderRejected', async ({ salesPerson }) => {
  try {
    const { sales_name, sales_id } = salesPerson;
    const deviceToken = 'AAAAgt3qpdw:APA91bEENlGDPJDUGNCCkRBTH56yKE1rOc2n7A4UQQnwTENwUoq0keQ8uuxYa_7TS8I7eP9NsgDeXMZcFkA6nWcumcmntaq30cc_aSQAQ_jMmhouh5PXkKSyRABCT-f5PUvCZD9aSIB3';

    console.log(`Notification: Order for salesperson -->> ${sales_id} and  --> ${sales_name} is canceled. Notify Sales Manager.`);

    // Additional logic related to notifying the sales manager can be added here


    // Send FCM notification
    const message = `Order for salesperson ${sales_id} and ${sales_name} is canceled. Notify Sales Manager.`;
    await sendPushNotification(deviceToken, message);
  } catch (error) {
    console.error('Error handling OrderRejected event:', error);
  }
});



 /// Create the Order  ///
exports.create = async (req, res) => {
    try {
        const data = (max) => {
            const newdata = Math.floor(Math.random() * max);
            console.log(newdata);
            return newdata;
        };

        // Replace max with a specific value when calling the function
        const result = data(1000000000000000); // Replace 100 with your desired max value

        // Create a new sales order instance
        const orderId = result;  // Store the generated order ID in a variable
        const pdfDirectory = path.join(__dirname, 'order');  // Specify the directory where you want to save the PDF files
        const pdfPath = path.join(pdfDirectory, `${orderId}.pdf`);  // Specify the path for the PDF file
        console.log(pdfPath)

        // Create the 'order' directory if it doesn't exist
        await fs.mkdir(pdfDirectory, { recursive: true });

        const user = new salesorder({
            clientName: req.body.clientName,
            firmName: req.body.firmName,
            address: req.body.address,
            city: req.body.city,
            phone_no: req.body.phone_no,
            sales_id: req.body.sales_id,
            Email:req.body.Email,
            sales_name: req.body.sales_name,
            orderId: orderId,  // Use the stored order ID
            currentDate: new Date().toISOString(),
            deliveryDate: req.body.deliveryDate,
            note: req.body.note,
            orderstatus: req.body.orderstatus,
            Order_mark: req.body.Order_mark,
            products: req.body.products,
            ph_id: req.body.ph_id,
            ph_name: req.body.ph_name,
            process_bar: req.body.process_bar,
            smName: req.body.smName,
            vehicleNum: req.body.vehicleNum,
            dpDate: req.body.dpDate,
            dpRecieved: req.body.dpRecieved,
            dpPhone: req.body.dpPhone,
            dpTotalWeight: req.body.dpTotalWeight,
            productionincharge: req.body.productionincharge,
            pdf_order: {
                type: 'application/pdf',
                data: null,  // Initialize with null, will be replaced later
            },
            pdf_url:null

        });

             // Check stock availability for each product in the order
        for (const product of req.body.products) {
            const product_name = product.select_product;
            const company = product.company;
            const grade = product.grade;
            const topcolor = product.topcolor;
            const coating = product.coating;
            const temper = product.temper;
            const guardfilm = product.guardfilm;
            const weight = product.weight;

            const stock_data = await stock.findOne({
                product: product_name,
                company: company,
                grade: grade,
                topcolor: topcolor,
                coatingnum: coating,
                temper: temper,
                guardfilm: guardfilm
            });
            console.log(stock_data.weight)

            if (stock_data && stock_data.weight >= weight) {

                // Sufficient stock is available, update stock quantity
                stock_data.weight -= weight;
                await stock_data.save();
            } else {
                return res.status(404).json({ "status": 404, "msg": 'Order cannot be placed due to insufficient stock' });
            }
        }
        

        const browser = await puppeteer.launch({
            headless: 'new', 
            args: ['--no-sandbox'],// Set to true if you want to run in headless mode
            
        });

        const page = await browser.newPage();

        // Assuming 'orderDetailsHTML' is a variable containing your HTML content
        const orderDetailsHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: 'Arial', sans-serif;
                    margin: 20px;
                    background-color: #f4f4f4;
                    color: #333;
                }
        
                h1, h2 {
                    color: black;
                    text-align:center
                    font-size:17px
                }
        
                p {
                    margin-bottom: 10px;
                }
        
                ul {
                    list-style: none;
                    padding: 0;
                }
        
                li {
                    border: 1px solid #ddd;
                    border-radius: 5px;
                    margin-bottom: 15px;
                    padding: 15px;
                    background-color: #fff;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    line-height:35px
                }
        
                strong {
                    color: #007bff;
                }
            </style>
            <title>Order Details</title>
        </head>
        <body>
            <h1>Order Details</h1>
            <p><strong>Order ID:</strong> ${orderId}</p>
            <p><strong>Client Name:</strong> ${req.body.clientName}</p>
            <p><strong>First Name:</strong> ${req.body.firmName}</p>
            <p><strong>Address:</strong> ${req.body.address}</p>
            <p><strong>City:</strong> ${req.body.city}</p>
            <p><strong>Phone Number:</strong> ${req.body.phone_no}</p>
            <p><strong>Email:</strong>${req.body.Email}
            <p><strong>Order Status:</strong> ${req.body.orderstatus !== undefined ? req.body.orderstatus : 'Pending'}</p>
            <p><strong>Order_mark:</strong> ${req.body.order_mark !== undefined ? req.body.order_mark : 'Pending'}</p>
            <p><strong>Sales ID:</strong> ${req.body.sales_id}</p>
            <p><strong>Total Weight:</strong>${req.body.dpTotalWeight}</p>
            <p><strong>PhoneNumber:</strong>${req.body.dpPhone}</p>
        
            <h2>Product Details</h2>
            <ul>
                ${req.body.products.map(product => `
                    <li>
                        <strong>Product Name:</strong> ${product.select_product}<br>
                        <strong>Company:</strong> ${product.company}<br>
                        <strong>Grade:</strong> ${product.grade}<br>
                        <strong>Top Color:</strong> ${product.topcolor}<br>
                        <strong>Coating:</strong> ${product.coating}<br>
                        <strong>Temper:</strong> ${product.temper}<br>
                        <strong>Guard Film:</strong> ${product.guardfilm}<br>
                        <strong>Weight:</strong> ${product.weight}<br>

                    </li>
                `).join('')}
            </ul>
        </body>
        </html>
        
    `;


        
        await page.setContent(orderDetailsHTML);

        await page.pdf({ path: pdfPath, format: 'A4' });

        await browser.close();
        
        // Create a read stream for the PDF file
        const pdfReadStream = fileSystem.createReadStream(pdfPath);

        const s3 = new AWS.S3({
            accessKeyId: process.env.ACCESS_KEY_ID ,
            secretAccessKey: process.env. SECRET_ACCESS_KEY,
          });
          
        const bucketName = 'orderssssss';

        const uploadParams = {
            Bucket: bucketName,
            Key: `${orderId}.pdf`,
            Body:pdfReadStream,  // Use fs.createReadStream here
            ContentType: 'application/pdf',
        };

       await s3.upload(uploadParams).promise();
        const params = {
            Bucket: bucketName,
            Key: `${orderId}.pdf`
        };

    // Get signed URL for the uploaded PDF
            const pdfURL = await s3.getSignedUrlPromise('getObject', params);

            console.log("pdfURL:" + pdfURL)

        // Set pdf_order data as the S3 URL
        user.pdf_url = pdfURL;


        // Ensure pdf_order is an object with type and data properties
        if (!user.pdf_order || typeof user.pdf_order !== 'object') {
            user.pdf_order = {
                type: 'application/pdf',
                data: null,
            };
        } else {
            // If pdf_order is already an object, ensure it has the required properties
            user.pdf_order.type = 'application/pdf';
            user.pdf_order.data = null;
        }

        // Set pdf_order data as the path to the saved PDF file
        user.pdf_order.data = pdfPath;
        

        // Save the new sales order
        const newOrder = await user.save({ select: '-pdf_order' });
        
      // Remove pdf_order from the newOrder object
if (newOrder.pdf_order) {
    newOrder.pdf_order = undefined;
}

// Send the response with the newOrder object
return res.status(201).json({
    status: 201,
    msg: 'Order successfully created',
    newOrder,
});

        return res.status(201).json({ "status": 201, "msg": 'Order successfully created', newOrder });

    } catch (err) {
        console.log(err);
        res.status(400).json({ "status": 400, "message": "Something Went Wrong" });
    }
};







exports.availableStock = async (req, res) => {
    try {
        const {
            product,
            company,
            grade,
            topcolor,
            coating, // Assuming it's 'coatingnum' in req.query
            temper,
            guardfilm
        } = req.query;

        // Construct a query object based on the provided parameters
        const query = {
            product,
            company,
            grade,
            topcolor,
            coating, // Map 'coatingnum' to 'coating' field
            temper,
            guardfilm
        };

        // Use the query to retrieve all data from the database
        const allStockData = await stock.find({});

        console.log("All stock data:", allStockData);

        // Filter the data based on the provided parameters
        const filteredData = allStockData.filter(data => {
            return (
                (!product || data.product === product) &&
                (!company || data.company === company) &&
                (!grade || data.grade === grade) &&
                (!topcolor || data.topcolor === topcolor) &&
                (!coating || data.coating === coating) &&
                (!temper || data.temper === temper) &&
                (!guardfilm || data.guardfilm === guardfilm)
            );
        });

        console.log("Filtered data:", filteredData);

        if (filteredData.length === 0) {
            res.status(400).json({ isAvailable: 'False', status: 400, message: "Out Of Stock" });
        } else {
            res.status(200).json({ isAvailable: 'True', status: 200, message: "Stock Available", filteredData });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 500, message: "Something Went Wrong" });
    }
};



exports.get = async(req, res) => {
    // Rest of the code will go here
    const orderList = await salesorder.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
        {
            $lookup: {
                from: 'clients',
                localField: 'oId',
                foreignField: 'firmName',
                as: 'orderdetails'
            }
        }
    ]).sort({_id:-1});
    res.json({ "status": 200, "message": 'data has been fetched', res: orderList });
}



// get
exports.get = async(req, res) => {
        // Rest of the code will go here
        const orderList = await salesorder.findById(req.params.id);
        if(orderList)
        {
            res.json({ "status": 200, "msg": 'data has been fetched', res: orderList });
        }else
        {
            res.json({ status:"400",message: "No Record found" });
        }
        
    }

    exports.edit = async (req, res) => {
        try {
            const findsalesOrder = await salesorder.findById(req.params.id);
            if (findsalesOrder) {
                // Update the sales order in the database
                const updatesalesOrder = await salesorder.findByIdAndUpdate(req.params.id, req.body, { new: true });
                console.log("updated data is", updatesalesOrder);
    
                console.log("body data is", req.body);
    
                // Generate a new PDF with updated information using Puppeteer
                const browser = await puppeteer.launch({
                    headless: 'new',
                    args: ['--no-sandbox'],
                });
                const page = await browser.newPage();
    
                // Generate HTML content for the PDF
                let orderDetailsHTML = `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                        body {
                            font-family: 'Arial', sans-serif;
                            margin: 20px;
                            background-color: #f4f4f4;
                            color: #333;
                        }
                
                        h1, h2 {
                            color: black;
                            text-align:center
                            font-size:17px
                        }
                
                        p {
                            margin-bottom: 10px;
                        }
                
                        ul {
                            list-style: none;
                            padding: 0;
                        }
                
                        li {
                            border: 1px solid #ddd;
                            border-radius: 5px;
                            margin-bottom: 15px;
                            padding: 15px;
                            background-color: #fff;
                            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                            line-height:35px
                        }
                
                        strong {
                            color: #007bff;
                        }
                    </style>
                        <title>Order Details</title>
                    </head>
                    <body>
                        <h1>Order Details</h1>
                        <p><strong>Order ID:</strong> ${req.body.orderId}</p>
                        <p><strong>Client Name:</strong> ${req.body.clientName}</p>
                        <p><strong>First Name:</strong> ${req.body.firmName}</p>
                        <p><strong>Address:</strong> ${req.body.address}</p>
                        <p><strong>City:</strong> ${req.body.city}</p>
                        <p><strong>Phone Number:</strong> ${req.body.phone_no}</p>
                        <p><strong>Email:</strong> ${req.body.Email}</p>
                        <p><strong>Order Status:</strong> ${req.body.orderstatus !== undefined ? req.body.orderstatus : 'Pending'}</p>
                        <p><strong>Order_mark:</strong> ${req.body.order_mark !== undefined ? req.body.order_mark : 'Pending'}</p>
                        <p><strong>Sales ID:</strong> ${req.body.sales_id}</p>
                        <p><strong>Total Weight:</strong> ${req.body.dpTotalWeight}</p>
                        <p><strong>PhoneNumber:</strong> ${req.body.dpPhone}</p>
    
                        <h2>Product Details</h2>
                        <ul>
                `;
    
                // Check if updatesalesOrder contains an array of products
                if (Array.isArray(updatesalesOrder.products)) {
                    for (const product of updatesalesOrder.products) {
                        orderDetailsHTML += `
                            <li>
                                <strong>Product Name:</strong> ${product.select_product}<br>
                                <strong>Company:</strong> ${product.company}<br>
                                <strong>Grade:</strong> ${product.grade}<br>
                                <strong>Top Color:</strong> ${product.topcolor}<br>
                                <strong>Coating:</strong> ${product.coating}<br>
                                <strong>Temper:</strong> ${product.temper}<br>
                                <strong>Guard Film:</strong> ${product.guardfilm}<br>
                                <strong>Weight:</strong> ${product.weight}<br>
                            </li>
                        `;
                    }
                } else {
                    console.error("Products data not found in updatesalesOrder");
                }
    
                orderDetailsHTML += `
                        </ul>
                    </body>
                    </html>
                `;
    
                await page.setContent(orderDetailsHTML);
                const pdfBuffer = await page.pdf({ format: 'A4' });
                await browser.close();
    
                // Upload the updated PDF to AWS S3
                const s3 = new AWS.S3({
                    accessKeyId: process.env.ACCESS_KEY_ID ,
            secretAccessKey: process.env. SECRET_ACCESS_KEY,
                  });
                const bucketName = 'orderssssss';
                const uploadParams = {
                    Bucket: bucketName,
                    Key: `${updatesalesOrder.orderId}.pdf`,
                    Body: pdfBuffer,
                    ContentType: 'application/pdf',
                };
                await s3.upload(uploadParams).promise();
    
                // Get the signed URL for the updated PDF
                const params = {
                    Bucket: bucketName,
                    Key: `${updatesalesOrder.orderId}.pdf`
                };
                const updatedPDFURL = await s3.getSignedUrlPromise('getObject', params);
                console.log("updatedPDFURL is", updatedPDFURL);
    
                // Update the PDF URL in the sales order object
                updatesalesOrder.pdf_url = updatedPDFURL;
    
                // Save the updated sales order
                await updatesalesOrder.save();
    
                console.log("Updated sales order:", updatesalesOrder);
    
                res.status(200).json({
                    updatedData: updatesalesOrder,
                    UpdatedURL: updatedPDFURL
                });
            } else {
                res.status(404).json("Sales order not found");
            }
        } catch (error) {
            console.error(error);
            res.status(500).json("Data is not updated");
        }
    };
    
    
    
    // // put one
    // exports.edit = async (req, res) => {
    //     try {
    //         // Update record from collection
    //         var updatedUser;
    //         var status = "0";
    
    //         switch (req.body.updateType) {
    //             case 'batchUpdate':
    //                 updatedUser = await salesorder.findOneAndUpdate({
    //                     _id: new mongoose.Types.ObjectId(req.params.id),
    //                     "products.productId": req.body.pid
    //                 }, {
    //                     $set: {
    //                         "products.$.batch_list": req.body.products.batch_list,
    //                         "orderstatus": "2"
    //                     }
    //                 }, { multi: true });
    //                 status = "2";
    //                 break;
    
    //             case 'productionInUpdate':
    //                 updatedUser = await salesorder.findOneAndUpdate({
    //                     _id: new mongoose.Types.ObjectId(req.params.id),
    //                     "products.productId": req.body.pid
    //                 }, {
    //                     $set: {
    //                         "products.$.pIn_id": req.body.products.pIn_id,
    //                         "products.$.productionincharge": req.body.products.productionincharge,
    //                         "products.$.assignDate": req.body.products.assignDate,
    //                         "products.$.completionDate": req.body.products.completionDate,
    //                         "products.$.phNote": req.body.products.phNote,
    //                         "orderstatus": "1"
    //                     }
    //                 }, { multi: true });
    //                 status = "1";
    //                 break;
    
    //             case 'SalesManager':
    //                 updatedUser = await salesorder.findOneAndUpdate(
    //                     { _id: new mongoose.Types.ObjectId(req.params.id) },
    //                     {
    //                         $set: {
    //                             clientName: req.body.clientName,
    //                             firmName: req.body.firmName,
    //                             address: req.body.address,
    //                             city: req.body.city,
    //                             phone_no: req.body.phone_no,
    //                             sales_id: req.body.sales_id,
    //                             sales_name: req.body.sales_name,
    //                             orderId: req.body.orderId,
    //                             currentDate: new Date().toISOString(),
    //                             deliveryDate: req.body.deliveryDate,
    //                             note: req.body.note,
    //                             products: req.body.products,
    //                             ph_id: req.body.ph_id,
    //                             ph_name: req.body.ph_name,
    //                             process_bar: req.body.process_bar,
    //                             smName: req.body.smName,
    //                             vehicleNum: req.body.vehicleNum,
    //                             dpDate: req.body.dpDate,
    //                             dpRecieved: req.body.dpRecieved,
    //                             dpPhone: req.body.dpPhone,
    //                             dpTotalWeight: req.body.dpTotalWeight,
    //                             "orderstatus": "0"
    //                         }
    //                     }, { multi: true }
    //                 );
    //                 status = "0";
    //                 break;
    
    //             default:
    //                 updatedUser = await salesorder.findOneAndUpdate(req.params.id, req.body, { new: true });
    //                 status = "3";
    //                 console.log(updatedUser)
    //         }
    
    //         var updStatus = await salesorder.findById(req.params.id).exec();
    //         updStatus.set({ 'orderstatus': status });
    //         await updStatus.save();
    
    //         updatedUser = await salesorder.findById(req.params.id);
    //         res.status(201).json({ "status": 200, "msg": 'record successfully updated', res: updatedUser });
    
    //     } catch (err) {
    //         res.status(400).json({ message: err.message });
    //     }
    // };


// delete
exports.delete = async(req, res) => {
        try {
            
         const user_data= await salesorder.findById(req.params.id);
          if(user_data){
            await salesorder.findById(req.params.id).deleteOne();
            res.json({ status:"200",message: "Record has been deleted " });
          }else
        {
         
         res.json({ status:"201",message: "No Record found" });
          }
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }

 
    exports.allRecords = async (req, res) => {
        try {
            const resPerPage = 10; // results per page
            const page = req.params.page || 1; // Page 
            const orderList = await salesorder.find().select({ pdf_order: false })
                  // Remove pdf_order from the newOrder object
                .sort({ '_id': -1 })
                .populate({
                    path: 'productionincharge',
                    select: '_id UserName' // Specify the fields you want to include from the 'productionincharge' collection
                }).populate({
                    path:'db_id',
                    select:'_id UserName'
                }).populate({
                    path:'products.productId',
                    select:'batch_number'
                })
                .skip((resPerPage * page) - resPerPage)
                .limit(resPerPage);
            
    
            res.json({ "status": 200, "msg": 'data has been fetched', res: orderList });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    };
    


