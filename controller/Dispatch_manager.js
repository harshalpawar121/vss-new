const SalesManager = require('../models/sales');
const eventEmitter = require('../utils/eventEmitter');
const admin = require('firebase-admin');
const serviceAccount = require('../config/fcm.json');
const { findOneAndUpdate } = require('../models/Inventory');
const moment = require('moment')



// Check if Firebase Admin SDK is already initialized
if (!admin.apps.length) {
  // Initialize Firebase Admin SDK
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}



// Define the sendPushNotification function (replace with your actual implementation)
async function sendPushNotification(deviceToken, message) {
  const payload = {
    notification: {
      title: 'Order is Completed, Please Pick Up the order',
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




// // Listen for 'Complete' event
// eventEmitter.on('Complete', async ({ DispatchPerson, orderId }) => {
//   try {
//     // Find the Dispatch Manager using the correct data type for DispatchPerson
//     const dispatchPerson = await SalesManager.findOne({ db_id: DispatchPerson.db_id }).populate({
//       path:'db_id',
//       select:'_id UserName'
//     });



//     console.log('DispatchPerson is',dispatchPerson)

//     if (!dispatchPerson) {
//       console.error('Dispatch Person not found for db_id:', DispatchPerson.db_id);
//       return;
//     }

//     const { db_id } = dispatchPerson;

//     const staticDeviceToken = 'your_static_device_token'; // Replace with your static device token

//     console.log(`Order is Completed, Please Pick Up the order for Dispatch Manager with db_id: ${db_id}`);

//     // Additional logic related to notifying the dispatch manager can be added here

//     // Send FCM notification to the static device token
//     const message = `Order is Completed, Please Pick Up the order for Dispatch Manager with Id: ${db_id} and orderId: ${orderId}`;
//     await sendPushNotification(staticDeviceToken, message);
//   } catch (error) {
//     console.error('Error handling Complete event:', error);
//   }
// });
// Listen for 'Complete' event
// Listen for 'Complete' event

// Listen for 'Complete' event
eventEmitter.on('Complete', async ({ DispatchPerson, orderId }) => {
  try {
    // Extract db_id from DispatchPerson
    const { db_id } = DispatchPerson;
    const deviceToken = 'token'; // Replace with your actual device token

    console.log(`Order is Completed, Please Pick Up the order for Dispatch Manager with db_id: ${db_id}, with OrderId ${orderId}`);

    // Additional logic related to notifying the dispatch manager can be added here

    // Send FCM notification to the specified device token
    const message = `Order is Completed, Please Pick Up the order for Dispatch Manager with Id: ${db_id} with OrderId: ${orderId}`;
    await sendPushNotification(deviceToken, message);
  } catch (error) {
    console.error('Error handling Complete event:', error);
  }
});



exports.Showorderdetails = async (req, res) => {
  try {

    const orderDeatils = await SalesManager.find({}).populate({
      path: 'db_id',
      select: '_id UserName'
    })
    if (!orderDeatils) {
      res.status(400).json({
        message: 'OrderDetails is not found'
      })
    }

    const filterOrdermark = orderDeatils.filter((item) => item.Order_mark === 'Complete')
    console.log(filterOrdermark)

    res.status(200).json({
      orderDeatils: filterOrdermark
    })


  } catch (error) {

    res.status(500).json({
      message: error
    })

  }
}


exports.RecivedOrder = async (req, res) => {
  try {
    const orderId = req.query.orderId;

    const TotalWeight = req.query.dpTotalWeight

    let current_date = req.query.dpDate || moment().format('YYYY-MM-DD HH:mm:ss');

    const dpRecieved = req.query.dpRecieved;

    // Check if the order is marked as 'Complete'
    const order = await SalesManager.findOne({ orderId, Order_mark: 'Complete', TotalWeight, dpRecieved, current_date });
    console.log("Order Details with Order_Mark ", order)
    if (!order) {
      return res.status(400).json({
        message: 'Order is not marked as Complete or not found',
      });
    }

    order.dpRecieved = dpRecieved
    order.dpTotalWeight = TotalWeight
    order.dpDate = current_date

    const updateOrder = await order.save()
    res.status(200).json({
      message: 'Order received successfully',
      updateOrder,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      message: 'Internal Server Error',
    });
  }
};

