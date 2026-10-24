import { store } from "./../store"
import {
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    RTCRtpTransceiver,
    RTCRtpReceiver,
    RTCRtpSender,
    RTCErrorEvent,
    MediaStream,
    MediaStreamTrack,
    mediaDevices,
    permissions,
    registerGlobals,
    RTCView
    //@ts-ignore
} from "react-native-webrtc-web-shim";
import { pushSubRemoteStream, setPubLocalStream, setStreamRoomRemoteCandidate, type SubscriptionsObject } from "./conferenceSlice";
import { JANUSMQTT } from './../../node_modules/react-native-janus-mqtt/src/protocol';



//May be used by publisher handle
export async function doOffer(handlePub: any, peerContx: any) {


    peerContx.pcPub = new RTCPeerConnection({ iceServers: [{ urls: 'stun:tuchati.loprice.co.tz:3478' }] })

    peerContx.pcPub.onnegotiationneeded = (event: any) => console.log('peerContx.pcPub.onnegotiationneeded', event);
    peerContx.pcPub.onicecandidate = (event: any) => {
        // When you find a null candidate then there are no more candidates.
        // Gathering of candidates has finished.
        try {

            const candidate = {

                "candidate": event.candidate.candidate,

                "sdpMLineIndex": event.candidate.sdpMLineIndex,

                "sdpMid": event.candidate.sdpMid
            }
            handlePub.tricklle(candidate)
            console.log(candidate)
            // Send the event.candidate onto the person you're calling.
            // Keeping to Trickle ICE Standards, you should send the candidates immediately.
        } catch (null_candidate) {
            handlePub.tricklleComplete()
            console.log(null_candidate)
            console.log(event)
        }
        console.log("----------------------icecandidate----stufF---------------")
    }



    peerContx.pcPub.oniceconnectionstatechange = (event: any) => {
        if (peerContx.pcPub.iceConnectionState === 'failed'
            || peerContx.pcPub.iceConnectionState === 'disconnected'
            || peerContx.pcPub.iceConnectionState === 'closed') {
            closePc(peerContx.pcPub)
            //streamingContext.peerconn = null
        } else if (peerContx.pcPub.iceConnectionState === 'connected') {
        } else if (peerContx.pcPub.iceConnectionState === 'completed') {
        }
        console.log(peerContx.pcPub.iceConnectionState)
        console.log("-----------------iceconnectionstatechange---------------")
    };
    /* This one below should not be fired, cause the PC is used just to send */
    peerContx.pcPub.ontrack = (event: any) => console.log('peerContx.pcPub.ontrack', event);




   


    try {
        const localStream = await mediaDevices.getUserMedia({ audio: true, video: true });
        localStream.getTracks().forEach((track: any) => {
            console.log('adding track', track);
            peerContx.pcPub.addTrack(track, localStream);
        });


        //localStream, feed, display, room 
        store.dispatch(setPubLocalStream(localStream))

    } catch (e) {

        console.log('error while doing offer', e);
        return;
    }


    try {

        const offer = await peerContx.pcPub.createOffer();

        peerContx.pcPub.setLocalDescription(offer);
        console.log('set local sdp OK');
        return offer;
    } catch (e) {
        console.log('error while doing offer', e);
        //removeAllLocalMediaElements();
        //closePubPc();
        return;
    }



}







export function eventTrickle(handle: any, pc: any) {


    let remoCandidates = [];

    handle.on(JANUSMQTT.EVENT.HANDLE_TRICKLE, (evtdata: any) => {
        if ((pc.signalingstatechange == "have-local-offer")
            || (pc.signalingstatechange == "stable")) {
            const completed = evtdata.complete
            if (completed) {
                //@ts-ignore
                remoCandidates.push(null);
                store.dispatch(setStreamRoomRemoteCandidate(remoCandidates))
                console.log(remoCandidates)
                console.log("------------------null--------list------------------------------------")
            } else {
                const iceCandidate = new RTCIceCandidate(evtdata);
                //@ts-ignore
                remoCandidates.push(iceCandidate);
                console.log(remoCandidates)
                console.log("--------------------------list------------------------------------")
            }
        }

        console.log(evtdata)
        console.log("--------------------------eventTrickle------------------------------------")
    });
}

export function processCandidates(peerConnection: any, remoteCandidates: any) {
    if (remoteCandidates.length < 1) { return; };
    remoteCandidates.map((candidate: any) => {
        peerConnection.addIceCandidate(candidate);
        console.log(candidate)
        console.log("---------------------saving--saved--remote---candidate-------------------------")
    });
    console.log(remoteCandidates)
    console.log("---------------------clearing--remote---candidate----list---------------------")
    store.dispatch(setStreamRoomRemoteCandidate([]))
}


//May be used by subscriber handle
export async function doOfferAnswer(handleSub: any, peerContx: any, r_jsep: any) {



    peerContx.pcSub = new RTCPeerConnection({ iceServers: [{ urls: 'stun:tuchati.loprice.co.tz:3478' }] })

   
    peerContx.pcSub.onnegotiationneeded = (event: any) => console.log('peerContx.pcSub.onnegotiationneeded', event);

   
    peerContx.pcSub.onicecandidate = (event: any) => {
        // When you find a null candidate then there are no more candidates.
        // Gathering of candidates has finished.
        try {

            const candidate = {
                //@ts-ignore
                "candidate": event.candidate.candidate,
                //@ts-ignore
                "sdpMLineIndex": event.candidate.sdpMLineIndex,
                //@ts-ignore
                "sdpMid": event.candidate.sdpMid
            }
            handleSub.tricklle(candidate)
            console.log(candidate)
            // Send the event.candidate onto the person you're calling.
            // Keeping to Trickle ICE Standards, you should send the candidates immediately.
        } catch (null_candidate) {
            handleSub.tricklleComplete()
            console.log(null_candidate)
            console.log(event)
        }
        console.log("----------------------icecandidate----stufF---------------")
    }

    eventTrickle(handleSub, peerContx.pcSub);


   
    peerContx.pcSub.oniceconnectionstatechange = () => {
        if (peerContx.pcSub.iceConnectionState === 'failed' || peerContx.pcSub.iceConnectionState === 'closed') {
            //removeAllRemoteMediaElements();
            //closeSubPc();
        }
    };

   //@ts-ignore
    peerContx.pcSub.ontrack = event => {


        event.track.onunmute = (evt: any) => {
            console.log('track.onunmute', evt);
        };
        event.track.onmute = (evt: any) => {
            console.log('track.onmute', evt);
        };
        event.track.onended = (evt: any) => {
            console.log('track.onended', evt);
        };

        /* avoid latching tracks */
        //@ts-ignore
        const submid = event.transceiver?.mid || event.receiver.mid;
        const remoteStream = event.streams[0].id === 'janus' ? (new MediaStream([event.track])) : event.streams[0];
        const track_kind = event.track.kind


        if (event.track.kind == "video") {


            const strm = new MediaStream([event.track])
           

            //if (videoRoomContext.subscriptions.lenght - 1 == trackindex) {
            store.dispatch(pushSubRemoteStream({
                remotestream: strm,
                feed: undefined,
                display: undefined,
                room: undefined
            }))
            console.log({
                remotestream: strm,
                feed: undefined,
                display: undefined,
                room: undefined
            });
            console.log("-------------------------(event.track.kind == video)----------------------------------");
        }
        console.log('-----------------pc.ontrack', event);
        console.log("----------------------------remotestream-------------------------------");
    };

    

    try {
        if (r_jsep.lenght !== 0) {
            const offerDescription = new RTCSessionDescription(r_jsep);
            await peerContx.pcSub.setRemoteDescription(offerDescription);
            const answerDescription = await peerContx.pcSub.createAnswer();
            await peerContx.pcSub.setLocalDescription(answerDescription);
            console.log(" Got answer jsep ")
            return [answerDescription, peerContx.pcSub]
        } else {
            console.log("No offer jsep is found")
        }
    } catch (err) {
        console.log(err)
    };



}




//May be used by subscriber handle
export async function doOfferAnswerUpdate(peerContx: any, r_jsep: any) {


    try {

        console.log("-----------------------doOfferAnserUpdate-------------------------")

        const offerDescription = new RTCSessionDescription(r_jsep);
        await peerContx.pcSub.setRemoteDescription(offerDescription);
        const answerDescription = await peerContx.pcSub.createAnswer();
        await peerContx.pcSub.setLocalDescription(answerDescription);
        console.log(" Got answer jsep ")
        return answerDescription

    } catch (err) {
        console.log(err)
    };

}





export function closePc(pc: any) {

    if (!pc) return;
    pc.getSenders().forEach((sender: any) => {
        if (sender.track)
            sender.track.stop();
    });
    pc.getReceivers().forEach((receiver: any) => {
        if (receiver.track)
            receiver.track.stop();
    });
    pc.onnegotiationneeded = null;
    pc.onicecandidate = null;
    pc.oniceconnectionstatechange = null;
    pc.ontrack = null;
    try {
        pc.close();
        //streamingContext.peerconn = null
    } catch (_e) { }
}






//May be used by publisher handle
export async function saveReceivedJsepAnswer(peerContx: any, r_jsep: any) {

    try {
        // Use the received receivedAnswerDescription
        const receivedAnswerDescription = new RTCSessionDescription(r_jsep);
        console.log("Answer description object is ok")
        console.log(peerContx.pcPub.signalingState)
        console.log("-----------------signalingstatechange---------------")
        await peerContx.pcPub.setRemoteDescription(receivedAnswerDescription);
        console.log(" Saved answer jsep ")
    } catch (err) {
        console.log(err)
        console.log("---------------------------------answer---jse----error-----------------------")
    };
}





