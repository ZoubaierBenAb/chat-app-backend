import { FriendRequest } from "../models/friendRequest.js";
import { User } from "../models/user.js";
import { filterObj } from "../utils/filterObj.js";
import { AudioCall } from "../models/audioCall.js";
import { VideoCall } from "../models/videoCall.js";
import { catchAsync } from "../utils/catchAsync.js";
import { OneToOneMessage } from "../models/oneToOneMessage.js";

export const getMe = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: "success",
    data: req.user,
  });
});
export const updateME = catchAsync(async (req, res, next) => {
  // whenever some middleware is going to be after the protect middle then will be able to access the user
  const { user } = req;
  const filtredBody = filterObj(
    req.body,
    "firstName",
    "lastName",
    "about",
    "avatar"
  );

  const updatedUser = await User.findByIdAndUpdate(user._id, filtredBody, {
    new: true,
    validateModifiedOnly: true,
  });

  res.status(200).json({
    data: updatedUser,
    message: "Profile updated successfully!",
  });
})

export const getUsers = catchAsync(async (req, res, next) => {
  const all_users = await User.find({
    verified: true,
  }).select("firstName lastName _id");

  const this_user = req.user;

  const remaining_users = all_users
    .filter(
      (user) =>
        !this_user.friends.includes(user._id) && // Check if the user is not a friend
        user._id.toString() !== req.user._id.toString() // Check if it's not the same user
    )
    .map((user) => ({
      _id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
    }));
console.log(remaining_users)
  res.status(200).json({
    data: remaining_users,
    message: "Users found successfully",
  });
});

export const getAllVerifiedUsers = catchAsync(async (req, res, next) => {
  const all_users = await User.find({
    verified: true,
  }).select("firstName lastName _id");

  const remaining_users = all_users.filter(
    (user) => user._id.toString() !== req.user._id.toString()
  );
  

  res.status(200).json({
    status: "success",
    data: remaining_users,
    message: "Users found successfully!",
  });
});
export const getFriends =catchAsync(async (req, res, next) => {
  const this_user = await User.findById(req.user._id).populate(
    "friends",
    "_id firstName lastName"
  );

  res.status(200).json({
    data: this_user.friends,
    message: "Friends found successfully",
  })
}) 

export const getFriendRequests =catchAsync(async (req, res, next) => {
  const requests = await FriendRequest.find({
    recipient: req.user._id.toString(),
  }).populate("sender", "_id firstName lastName");
  
  // get all the documents where the user is the recipient
console.log('casda',requests)
  res.status(200).json({
    message: "Friend requests found successfully",
    data: requests,
  })
}
) 

export const getSentFriendRequests = catchAsync(async(req,res,next)=>{

  const sent_friend_request = await FriendRequest.find({
    sender : req.user._id
  }).populate('recipient','_id')

  const recipientIds = sent_friend_request.map(request => request.recipient._id.toString())

  res.status(200).json({
    message : 'Sent requests found successfully',
    data : recipientIds
  })

})


export const deleteFriendRequest = catchAsync(async (req, res, next) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({
      message: 'Missing user_id in the request body',
    });
  }

  const friend_request = await FriendRequest.findOneAndDelete({
    sender: req.user._id,
    recipient: user_id,
  });

  if (!friend_request) {
    return res.status(404).json({
      message: 'Friend request not found',
    });
  }

  res.status(200).json({
    message: 'Friend request deleted successfully',
  });
});

export const startAudioCall = catchAsync(async (req, res, next) => {
  const from = req.user._id;
  const to = req.body.id;

  const from_user = await User.findById(from);
  const to_user = await User.findById(to);

  // create a new call audioCall Doc and send required data to client
  const new_audio_call = await AudioCall.create({
    participants: [from, to],
    from,
    to,
    status: "Ongoing",
  });

  res.status(200).json({
    data: {
      from: to_user,
      roomID: new_audio_call._id,
      streamID: to,
      userID: from,
      userName: from,
    },
  });
});
export const startVideoCall = catchAsync(async (req, res, next) => {
  const from = req.user._id;
  const to = req.body.id;

  const from_user = await User.findById(from);
  const to_user = await User.findById(to);

  // create a new call videoCall Doc and send required data to client
  const new_video_call = await VideoCall.create({
    participants: [from, to],
    from,
    to,
    status: "Ongoing",
  });

  res.status(200).json({
    data: {
      from: to_user,
      roomID: new_video_call._id,
      streamID: to,
      userID: from,
      userName: from,
    },
  });
});
export const getCallLogs = catchAsync(async (req, res, next) => {
  const user_id = req.user._id;

  const call_logs = [];

  const audio_calls = await AudioCall.find({
    participants: { $all: [user_id] },
  }).populate("from to");

  const video_calls = await VideoCall.find({
    participants: { $all: [user_id] },
  }).populate("from to");

  console.log(audio_calls, video_calls);

  for (let elm of audio_calls) {
    const missed = elm.verdict !== "Accepted";
    if (elm.from._id.toString() === user_id.toString()) {
      const other_user = elm.to;

      // outgoing
      call_logs.push({
        id: elm._id,
        img: other_user.avatar,
        name: other_user.firstName,
        online: true,
        incoming: false,
        missed,
      });
    } else {
      // incoming
      const other_user = elm.from;

      // outgoing
      call_logs.push({
        id: elm._id,
        img: other_user.avatar,
        name: other_user.firstName,
        online: true,
        incoming: false,
        missed,
      });
    }
  }

  for (let element of video_calls) {
    const missed = element.verdict !== "Accepted";
    if (element.from._id.toString() === user_id.toString()) {
      const other_user = element.to;

      // outgoing
      call_logs.push({
        id: element._id,
        img: other_user.avatar,
        name: other_user.firstName,
        online: true,
        incoming: false,
        missed,
      });
    } else {
      // incoming
      const other_user = element.from;

      // outgoing
      call_logs.push({
        id: element._id,
        img: other_user.avatar,
        name: other_user.firstName,
        online: true,
        incoming: false,
        missed,
      });
    }
  }

  res.status(200).json({
    status: "success",
    message: "Call Logs Found successfully!",
    data: call_logs,
  });
});


export const getConversations = catchAsync(async(req,res,next)=>{
try {
  const conversations = await OneToOneMessage.find({participants :{ $all : [req.user]}})
  res.status(200).json({
    data : conversations,
    status : 'success'
  })
} catch (error) {
  console.log(error)
}
  
})