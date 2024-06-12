const express=require('express')
const router=express.Router()
const Production_Incahrge=require('../controller/Production-incharge')


router.get('/Production_Incharge',Production_Incahrge.showOrderDetails)
router.get('/getstocks',Production_Incahrge.getStocks)
router.get('/getstocksdata',Production_Incahrge.getstocksdata)
router.get('/getstocksdataById/:id', Production_Incahrge.getstocksdataById);
router.patch('/editstocks/:batch_number',Production_Incahrge.editStocks)
router.patch('/pickup', Production_Incahrge.pickup)
router.patch('/assignDispatchManager/:id',Production_Incahrge.AssignOrder)
module.exports=router