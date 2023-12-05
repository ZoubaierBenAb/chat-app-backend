import express from 'express'
import { getCallLogs, getFriendRequests, getFriends, getUsers, updateME,getMe, getAllVerifiedUsers, getSentFriendRequests, deleteFriendRequest } from '../controllers/user.js'
import { protect } from '../controllers/auth.js'

const router = express.Router()

router.patch('/update-me',protect,updateME)
router.get('/get-users',protect,getUsers)
router.get('/get-friends',protect,getFriends)
router.get('/get-friend-requests',protect,getFriendRequests)
router.get("/get-me", protect,getMe);
router.get('/get_sent_friend_requests',protect,getSentFriendRequests)
router.get("/get-call-logs",protect,getCallLogs);
router.get("/get-all-verified-users", protect, getAllVerifiedUsers);
router.delete('/delete_friend_request',protect,deleteFriendRequest)
export default router