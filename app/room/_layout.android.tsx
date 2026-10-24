import { createContext, useContext, useEffect, useState } from "react";
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
} from 'react-native-webrtc';
import VideoRoomHandle, { CreateNewRoom } from './../../node_modules/react-native-janus-mqtt/src/plugins/videoroom-plugin'
import { setRemoteJsep, setStreamTitle, setPrivateId, setFeed, setStreamRoom, setPubLocalStream, setSubRemoteStream, setPublishers, setParticipants, findSubRemoteStreamReserve, type SubscriptionsObject } from "./conferenceSlice";
import { doOffer, doOfferAnswer, doOfferAnswerUpdate, saveReceivedJsepAnswer } from "./streaming_contract";
import { useAppDispatch, useAppSelector } from "../store";
import { Connection } from "react-native-janus-mqtt";
import type Session from "../../node_modules/react-native-janus-mqtt/src/session";
import { Logger } from "../../node_modules/react-native-janus-mqtt/src/utils";
import { ScrollView, View, Text, useWindowDimensions, Button, TextInput } from "react-native";
import { pc_ } from "./peercontext";





const LOG_NS = '[VideoRoom.ts]';
let connection: Connection;
let session: Session;
let handlePub: any;
let handleSub: any;
//let pcPub: RTCPeerConnection | null;
//let pcSub: RTCPeerConnection | null;

export default function Conference() {








    const { width, height } = useWindowDimensions();
    const {
        feed_,
        stream_title,
        stream_room,
        pub_localstream,
        stream_room_display,
        subscriptions
    } = useAppSelector(state => state.conference)
    const dispatch = useAppDispatch();

    const pc = useContext(pc_)
    const [rightpanel, setRightPanel] = useState(false)
    const [leftpanel, setLeftPanel] = useState(false)
    const [ismicon, setIsMicOn] = useState(true)
    const [isvideoon, setIsVideoOn] = useState(true)
    const [ispubjoined, setIsPubJoined] = useState(false)
    const [issubjoined, setIsSubJoined] = useState(false)


    useEffect(() => {
        //janusMqttConect()
        console.log("--------------------------events------------------------------------------")
    }, [])

    function janusMqttConect() {
        connection = new Connection({
            serverUrl: 'tuchati.loprice.co.tz',
            port: 5281,
            clientId: undefined,
            userName: 'test@tuchati.loprice.co.tz',
            password: 'test',
            tojanus: 'to-janus',
            fromjanus: 'from-janus',
            useSSL: true,
            keepAliveInterval: 0,
            reconnect: true,
            willMessageOptions: {
                topic: 'topic',
                qos: 0,
                retain: false,
                message: 'will',
            },
            onSuccess: () => {
                connection.setJanusMessageListerner();
                connection.setJanusMessageListerner2('status');
                Logger(`${LOG_NS}  connected successfully`);

            },
        });
    }




    async function createSession() {
        session = await connection.create();
    }

    async function createHandlePub() {
        (session !== undefined) ? handlePub = await session.attach(VideoRoomHandle) : console.log("session undefined")
    }

    async function createHandleSub() {
        (session !== undefined) ? handleSub = await session.attach(VideoRoomHandle) : console.log("session undefined")
    }



    async function closeSession() {
        await closePubHandle()
        await closeSubHandle()
        if (session !== undefined) await session.destroy()
        session = undefined
        setIsPubJoined(false)
        dispatch(setPubLocalStream(null))
    }

    async function closePubHandle() {
        (handlePub !== undefined) ? await handlePub.hangup() : console.log("handlePub undefined")
        handlePub = undefined
        dispatch(setPubLocalStream(null))
    }

    async function closeSubHandle() {
        (handleSub !== undefined) ? await handleSub.hangup() : console.log("handleSub undefined")
        handleSub = undefined
        dispatch(setSubRemoteStream([]))
    }


    function isSessionDefined() {
        if (session !== undefined) {
            return true
        } else {
            console.log("session undefined")
            return false
        }
    }


    function isPubDefined() {
        if (handlePub !== undefined) {
            return true
        } else {
            setIsPubJoined(false)
            console.log("handlePub undefined")
            return false
        }
    }

    function isSubDefined() {
        if (handleSub !== undefined) {
            return true
        } else {
            setIsSubJoined(false)
            console.log("handlePub undefined")
            return false
        }
    }


    function createRoom() {

        if (isPubDefined()) {
            //Crete room
            handlePub.create({
                room: stream_room ? parseInt(stream_room) : undefined,
                description: stream_title,
                max_publishers: 6,
                permanent: false,
                is_private: false,
                secret: undefined,
                pin: undefined,
                admin_key: undefined,
                bitrate: 128000, // This is a low cap, increase if you want to use simulcast or SVC
                bitrate_cap: false,
                fir_freq: 10,
                audiocodec: 'opus',
                videocodec: 'vp8',
                talking_events: false,
                talking_level_threshold: 25,
                talking_packets_threshold: 100,
                require_pvtid: false,
                notify_joining: false,
                require_e2ee: false,
                record: false,
                rec_dir: "/opt/janus/share/janus/recordings/",
                videoorient: false,
                h264_profile: 'high',
                vp9_profile: 'high',
                threads: 2
            }).then(async (res: any) => {
                dispatch(setStreamRoom(res.room))
                Logger(res)
                Logger("----------------------createRoom--------------------------------------")
            }).catch(async (err: any) => {
                //Even if the room is created arleady
                if (err.message.includes(stream_room)) {

                }
                console.log(err)
                console.log("-----------------createRoom-----err----------------------------")
            })
        }
    }















    async function joinPublishFeed() {

        //Publish your feed the handle is already joined in
        try {
            if (isPubDefined()) {
                //Create jsep offer
                const jsep = await doOffer(handlePub, pc)
                //videoRoomPubEvents()
                //Join and configure/publish your feed
                handlePub.joinConfigurePublisher(
                    {
                        room: parseInt(stream_room),
                        feed: undefined,
                        audio: true,
                        video: true,
                        data: true,
                        bitrate: 1280000,
                        record: false,
                        filename: "/opt/janus/share/janus/recordings/",
                        display: stream_room_display,
                        token: undefined,
                        pin: undefined,
                        e2ee: false,
                        descriptions: "",
                        jsep: jsep

                    }
                ).then((res: any) => {
                    const rjsp = res.jsep
                    if (rjsp) {
                        dispatch(setRemoteJsep(rjsp))
                        saveReceivedJsepAnswer(pc, rjsp)
                        dispatch(setStreamTitle(res.description))
                        dispatch(setPrivateId(res.private_id))
                        dispatch(setFeed(res.feed))
                        dispatch(setStreamRoom(res.room))
                        setIsPubJoined(true)
                        //const streams: any = []
                        // const pubs = res.publishers
                        // if (pubs) {

                        //    pubs.map((pub) => {

                        //        streams.push({
                        //            remotestream: undefined,
                        //            feed: pub.feed,
                        //            display: pub.display,
                        //            room: pub.room
                        //        })
                        //    })
                        //    dispatch(setPublishers(streams))
                        //    conferenceContext.conference_subscriptions = streams
                        //}

                    }
                    console.log(res)
                    console.log("--------------joinConfigurePublisher--------res----------------------------")
                }).catch(async (err: any) => {
                    if (err.message.includes("425 Already in as a publisher on this handle")) {

                        //Tear down handle and create another one
                        if (isSessionDefined()) {
                            await closeSession()
                            createSession().then(async (r) => {
                                await createHandlePub()
                                joinPublishFeed()
                                await createHandleSub()
                            })
                        }

                        //Publish your feed the handle is already joined in
                        //handlePub.publish({ display: stream_room_display, jsep: jsep }).then((ress: any) => {
                        // const rjsp = ress.jsep
                        // if (rjsp) {
                        //     dispatch(setRemoteJsep(rjsp))
                        //     saveReceivedJsepAnswer(pc, rjsp)
                        //     dispatch(setStreamTitle(ress.description))
                        //     dispatch(setPrivateId(ress.private_id))
                        //     dispatch(setFeed(ress.feed))
                        //     dispatch(setStreamRoom(ress.room))

                        //const streams: any = []
                        //const pubs = ress.publishers
                        //if (pubs) {
                        //    pubs.map((pub) => {
                        //        streams.push({ feed: pub.feed, display: pub.display })
                        //    })
                        //    dispatch(setPublishers(streams))
                        //    conferenceContext.conference_subscriptions = streams
                        //}
                        // }
                        // console.log(ress)
                        // console.log("------------publish----------ress----------------------------")
                        //}).catch((errr: any) => {

                        // if (errr.message.includes("490 Error setting ICE locally")) {
                        //     console.log("----------------------490 Error setting ICE locally----------------------------")

                        //closePcPub(conferenceContext)
                        //closePcSub(conferenceContext)
                        //     dispatch(setPubLocalStream(null))
                        //     dispatch(setSubRemoteStream([]))


                        //     handlePub.hangup()

                        //     handleSub.hangup()
                        //     handlePub = null
                        //     handleSub = null
                        //     pc.pcPub = undefined
                        //     pc.pcSub = null
                        //conferenceContext.conference_subscriptions = null
                        //session = null
                        // }


                        // console.log(errr)
                        // console.log("----------------publish------errr----------------------------")
                        //})


                    } else if (err.message.includes("490 Error setting ICE locally")) {
                        console.log("----------------------490 Error setting ICE locally----------------------------")

                        //closePcPub(conferenceContext)
                        //closePcSub(conferenceContext)
                        dispatch(setPubLocalStream(null))
                        dispatch(setSubRemoteStream([]))

                        closeSession()
                        setIsPubJoined(false)
                    }
                    console.log(err)
                    console.log("---------------joinConfigurePublisher-------err----------------------------")
                })
            }
        } catch (e) {
            setIsPubJoined(false)
            console.log(e)
            console.log("--------------------------catch-------------------------------------")
        }


    }

    function leave() {

        if (isPubDefined()) {
            handlePub.leave().then((res: any) => {

                //closePcPub(conferenceContext)
                //closePcSub(conferenceContext)
                dispatch(setPubLocalStream(null))
                dispatch(setSubRemoteStream([]))
                dispatch(setPublishers([]))
                setIsSubJoined(false)
                setIsPubJoined(false)

                closeSession()
                pc.subscriptions = []


                console.log(res)
                console.log("------------------------goodbye--------------------------------------")
            }).catch((error: any) => {


                //closePcPub(conferenceContext)
                //closePcSub(conferenceContext)
                dispatch(setPubLocalStream(null))
                dispatch(setSubRemoteStream([]))
                dispatch(setPublishers([]))
                setIsSubJoined(false)
                setIsPubJoined(false)

                closeSession()

                console.log(error)
                console.log("------------------------goodbye------error--------------------------------")
            })
        }
    }

    function joinSubscribeSubscriber() {
        if (isSubDefined()) {
            dispatch(setSubRemoteStream([]))

            handleSub.joinSubscriber(
                {
                    room: parseInt(stream_room),
                    feed: undefined, //deprecated
                    audio: true, //deprecated
                    video: true, //deprecated
                    data: true, //deprecated
                    offer_audio: true, //deprecated
                    offer_video: true, //deprecated
                    offer_data: true, //deprecated
                    private_id: undefined,
                    sc_substream_layer: undefined,
                    sc_substream_fallback_ms: 2,
                    sc_temporal_layers: undefined,
                    streams: subscriptions,
                    autoupdate: true,
                    use_msid: false,
                    token: undefined,
                    pin: undefined
                }
            ).then(async (res: any) => {
                const jsepp = res.jsep
                if (jsepp) {
                    dispatch(setRemoteJsep(jsepp))
                    const jsep_a = await doOfferAnswer(handleSub, pc, jsepp)
                    handleSub.start({ jsep: jsep_a }).then((response: any) => {
                        console.log(response)
                    })
                }


                setIsSubJoined(true)
                console.log(res)
                console.log("------------------------joinSubscriber-----------------------------")

            }).catch((err: any) => {
                if (err.message.includes("425 Already in as a subscriber on this handle")) {

                    handleSub.update({ subscribe: subscriptions }).then(async (ress: any) => {
                        const jsepp = ress.jsep
                        if (jsepp) {
                            dispatch(setRemoteJsep(jsepp))

                            //closePcSub(conferenceContext)
                            //pc.pcSub = null
                            dispatch(setSubRemoteStream([]))
                            const jsep_a = await doOfferAnswer(handleSub, pc, jsepp)
                            handleSub.start({ jsep: jsep_a }).then((response: any) => {
                                console.log(response)
                            })
                        }
                        console.log(ress)
                        console.log("------------------------subscribeSubscriber-----------------------------")
                    }).catch((err: any) => {
                        console.log(err)
                        console.log("-------------------subscribeSubscriber--------err-----------------------------")
                    })
                    setIsSubJoined(true)
                } else if (err.message.includes("429 Missing mandatory element (feed)")) {
                    setIsSubJoined(false)
                }
                console.log(subscriptions)
                console.log(err.message)
                console.log("-------------------joinSubscribeSubscriber----err--------------------------------")
            })
        }
    }

    async function joinSubscribeSubscriberRefresh() {
        if (isSessionDefined()) {
            if (isSubDefined()) {
                //closePcSub(pc.pcSub)
                dispatch(setSubRemoteStream([]))




                await closeSubHandle()
                await createHandleSub()

                handleSub.joinSubscriber({ room: stream_room, streams: subscriptions }).then(async (res: any) => {
                    const jsepp = res.jsep
                    if (jsepp) {
                        dispatch(setRemoteJsep(jsepp))
                        const jsep_a = await doOfferAnswer(handleSub, pc, jsepp)
                        handleSub.start({ jsep: jsep_a }).then((response: any) => {
                            console.log(response)
                        })
                    }


                    setIsSubJoined(true)
                    console.log(res)
                    console.log("------------------------joinSubscriber-----------------------------")

                }).catch((err: any) => {
                    if (err.message.includes("425 Already in as a subscriber on this handle")) {

                        handleSub.update({ subscribe: subscriptions }).then(async (ress: any) => {
                            const jsepp = ress.jsep
                            if (jsepp) {
                                dispatch(setRemoteJsep(jsepp))

                                //closePcSub(conferenceContext)
                                //pc.pcSub = null
                                dispatch(setSubRemoteStream([]))
                                const jsep_a = await doOfferAnswer(handleSub, pc, jsepp)
                                handleSub.start({ jsep: jsep_a }).then((response: any) => {
                                    console.log(response)
                                })
                            }
                            console.log(ress)
                            console.log("------------------------subscribeSubscriber-----------------------------")
                        }).catch((err: any) => {
                            console.log(err)
                            console.log("-------------------subscribeSubscriber--------err-----------------------------")
                        })
                        setIsSubJoined(true)
                    } else if (err.message.includes("429 Missing mandatory element (feed)")) {
                        setIsSubJoined(false)
                    }
                    console.log(err.message)
                    console.log("-------------------joinSubscribeSubscriber----err--------------------------------")
                })
            }
        }
    }

    function unPublishFeed() {
        //Publish your feed

        if (isPubDefined()) {
            handlePub.unpublish().then((res: any) => {

                //closePcPub(conferenceContext)
                //closePcSub(conferenceContext)
                dispatch(setPubLocalStream(null))
                setIsPubJoined(false)
                //dispatch(setSubRemoteStream([]))
                //dispatch(setPublishers([]))
                //setIsSubscribed(false)
                //@ts-ignore
                //handlePub.hangup()
                //@ts-ignore
                //handleSub.hangup()
                //handlePub = null
                //handleSub = null
                //pc.pcPub = undefined
                //pc.pcSub = null
                //conferenceContext.conference_subscriptions = null
                //session = null
            }).catch((error: any) => {

                //closePcPub(conferenceContext)
                //closePcSub(conferenceContext)
                dispatch(setPubLocalStream(null))
                setIsPubJoined(false)
                //dispatch(setSubRemoteStream([]))
                //setIsSubscribed(false)
                //@ts-ignore
                //handlePub.hangup()
                //@ts-ignore
                //handleSub.hangup()
                //handlePub = null
                //handleSub = null
                //pc.pcPub = undefined
                //pc.pcSub = null
                //conferenceContext.conference_subscriptions = null
                //session = null
            })
        }

    }

    function list() {
        if (isPubDefined()) {
            handlePub.listParticipants({ room: stream_room }).then((lst: any) => {
                const streams: any = []
                const pubs = lst.participants
                const room = lst.room
                if (pubs) {
                    pubs.map((pub: any) => {
                        if (pub.publisher) {
                            streams.push({
                                remotestream: undefined,
                                feed: pub.feed,
                                display: pub.display,
                                room: room
                            })
                        }
                    })
                    dispatch(setPublishers(streams))
                    dispatch(setParticipants(streams))
                    pc.subscriptions = streams
                }
                console.log(lst)
                console.log("---------------------------listParticipants--------------------------------------------")
            })
        }
    }

    function subscribeToNewFeed(streams: any) {

        handleSub.subscribe({ streams: streams }).then(async (ress: any) => {
            const jsepp = ress.jsep
            if (jsepp) {
                dispatch(setRemoteJsep(jsepp))
                //dispatch(setSubRemoteStream([]))
                //closePc(pc.pcSub)
                //pc.pcSub = null
                const jsep_a = await doOfferAnswerUpdate(handleSub, jsepp)
                handleSub.start({ jsep: jsep_a }).then((response: any) => {
                    console.log(response)
                    console.log("---------------------------start--response---------------------------------------")
                }).catch((err: any) => {
                    console.log(err)
                    console.log("-------------------start--------err-----------------------------")
                })
            } else {

                const feed = ress.feed
                dispatch(findSubRemoteStreamReserve(feed))
                console.log("-----------------------no--jsep-------------------------")
            }

            console.log(ress)
            console.log("------------------new--feed------subscribeToNewFeed-----------------------------")
        }).catch((err: any) => {
            console.log(err)
            console.log("-------------------subscribeToNewFeed--------err-----------------------------")
        })
    }


    function unSubscribe(streams: any) {
        if (isSubDefined()) {
            handleSub.unsubscribe({ streams: streams }).then(async (ress: any) => {
                dispatch(setPublishers([]))
                setIsSubJoined(false)
                console.log(ress)
                console.log("------------------unSubscribed-----------------------------")
            }).catch((err: any) => {
                console.log(err)
                console.log("-------------------unSubscribe--------err-----------------------------")
            })
        }
    }







    return (
        <View style={{ width: "100%", backgroundColor: "grey", flex: 1 }}>

            <View style={{ flexDirection: 'row' }} >


                <View style={{ backgroundColor: "green", width: width < 800 ? '100%' : "80%", flexDirection: 'column', height: height }} >


                    <View style={{
                        backgroundColor: "red",
                        flexDirection: 'row',
                        width: "100%",
                        height: "92%",
                        display: width < 600 ? 'flex' : 'flex',
                    }}>


                        <ScrollView showsHorizontalScrollIndicator={true} style={{ width: width, maxWidth: width }}>
                            <TextInput
                                style={{
                                    height: 40,
                                    margin: 12,
                                    borderWidth: 1,
                                    padding: 10,
                                }}
                                onChangeText={(text) => { dispatch(setStreamRoom(text)) }}
                                value={stream_room}
                                placeholder="Conference room"
                            />
                            {pub_localstream && (
                                <View style={{ backgroundColor: "white", flexDirection: 'column' }}>

                                    <RTCView
                                        style={{ height: 150, width: 200, backgroundColor: 'black' }}
                                        mirror={true}
                                        objectFit={'cover'}
                                        stream={pub_localstream}
                                        zOrder={10}
                                    />
                                    <Text style={{ maxWidth: 200, position: 'absolute', marginTop: 115, backgroundColor: 'white', padding: 4 }}>{stream_room_display}</Text>
                                </View>
                            )}
                            {
                                subscriptions.map((substreams: SubscriptionsObject) => {

                                    console.log(substreams)
                                    console.log("---------------- console.log(substreams)------------------------------------")
                                    return substreams.remotestream ? (


                                        <View style={{ flexDirection: 'column' }} >
                                            <RTCView
                                                style={{ height: 150, width: 200, backgroundColor: 'black' }}
                                                mirror={false}
                                                objectFit={'cover'}
                                                stream={substreams.remotestream}
                                                zOrder={10}
                                            />
                                                                                        <RTCView
                                                style={{ height: 150, width: 200, backgroundColor: 'black' }}
                                                mirror={false}
                                                objectFit={'cover'}
                                                stream={pub_localstream}
                                                zOrder={10}
                                            />
                                            <Text style={{ maxWidth: 200, position: 'absolute', alignSelf: 'flex-start', marginTop: 115, backgroundColor: 'white', padding: 4 }}>{substreams.display}</Text>
                                        </View>
                                    ) : (
                                        <View style={{ flexDirection: 'column' }} >
                                            <View
                                                style={{ height: 150, width: 200, backgroundColor: 'red' }}
                                            >

                                                //placeholder


                                            </View>
                                            <Text style={{ maxWidth: 200, position: 'absolute', alignSelf: 'flex-start', marginTop: 115, backgroundColor: 'white', padding: 4 }}>{substreams.display}</Text>
                                        </View>
                                    )
                                })
                            }

                        </ScrollView>
                    </View  >

                    <View
                        style={{
                            flex: 1,
                            alignItems: 'center',
                            marginBottom: 8,
                            position: "absolute",
                            bottom: 0,
                            zIndex: 100,
                            alignSelf: 'center',
                        }}
                    >
                        <View style={{
                            flexDirection: width < 800 ? 'column' : 'row',
                            gap: 4
                        }} >
                            <View style={{ flexDirection: 'row', gap: 4 }}>
                                <Button
                                    onPress={

                                        () => janusMqttConect()
                                    }
                                    title="Connect"

                                />

                                <Button
                                    onPress={
                                        () => createSession()
                                    }
                                    title="Create session"

                                />
                                <Button
                                    onPress={
                                        () => closeSession()
                                    }
                                    title="Destroy session"

                                />

                            </View  >
                            <View style={{ flexDirection: 'row', gap: 4 }}>

                                <Button
                                    onPress={() => createHandlePub()}
                                    title="Pub handle"

                                />

                                <Button
                                    onPress={() => createHandleSub()}
                                    title="Sub handle"

                                />
                            </View  >
                            <View style={{ flexDirection: 'row', gap: 4 }}>
                                <Button
                                    onPress={() => createRoom()}
                                    title="Create room"
                                />
                                <Button
                                    onPress={() => joinPublishFeed()}
                                    title="Publish"
                                />
                                <Button
                                    onPress={() => unPublishFeed()}
                                    title="Unpublish"

                                />
                                <Button
                                    onPress={

                                        () => leave()
                                    }
                                    title="Leave"

                                />
                            </View  >
                            <View style={{ flexDirection: 'row', gap: 4 }}>
                                <Button
                                    onPress={

                                        () => list()
                                    }
                                    title="Feeds"

                                />

                                <Button
                                    onPress={
                                        () => joinSubscribeSubscriber()
                                    }
                                    title="Subscribe"

                                />
                                <Button
                                    onPress={() => joinSubscribeSubscriberRefresh()}
                                    title="Re-subscribe"

                                />
                                <Button
                                    onPress={() => unSubscribe(subscriptions)}
                                    title="Unsubscribe"

                                />
                            </View  >
                        </View  >
                    </View>
                </View>
            </View>
        </View>
    )



    function videoRoomPubEvents() {

        try {
            pc.pcPub.once(VideoRoomHandle.EVENT.VIDEOROOM_UPDATED, (evtdata: any) => {
                //const streams = {feed: evtdata.publisters[0].feed}
                //subscribeToNewFeed(streams)
                //const jsepp = evtdata.jsep
                //subscribeToNewFeedStart(jsepp)
                //dispatch(setRemoteJsep(jsepp))
                console.log("VideoRoomHandle", '-----------updated--------', evtdata);
            });

            // custom videoroom publisher/manager events

            pc.pcPub.once(VideoRoomHandle.EVENT.VIDEOROOM_DESTROYED, (evtdata: any) => {
                console.log("VideoRoomHandle", 'destroyed', evtdata);
            });


            pc.pcPub.once(VideoRoomHandle.EVENT.VIDEOROOM_PUB_LIST, (evtdata: any) => {


                //subscribeToNewFeed([{ feed: evtdata.publishers[0].feed }])
                console.log("VideoRoomHandle", 'feed-list', evtdata);
            });


            pc.pcPub.once(VideoRoomHandle.EVENT.VIDEOROOM_PUB_PEER_JOINED, (evtdata: any) => {
                //subscribe({ vrh_sub: videoRoomContext.vrh_sub, streams: [{ feed: evtdata.feed }] })

                console.log("VideoRoomHandle", 'feed-joined', evtdata);
            });


            pc.pcPub.on(VideoRoomHandle.EVENT.VIDEOROOM_UNPUBLISHED, (evtdata: any) => {


                //unsubscribe({ vrh_sub: videoRoomContext.vrh_sub, streams : [{ feed: evtdata.feed }] })

                console.log("VideoRoomHandle", 'unpublished', evtdata);
            });


            pc.pcPub.once(VideoRoomHandle.EVENT.VIDEOROOM_LEAVING, async (evtdata: any) => {
                //if (pubHandle.feed === evtdata.feed) {
                //    await msHandles.detachPubHandle();
                //}
                console.log("VideoRoomHandle", 'leaving', evtdata);
            });


            pc.pcPub.once(VideoRoomHandle.EVENT.VIDEOROOM_DISPLAY, (evtdata: any) => {
                console.log("VideoRoomHandle", 'display', evtdata);
            });


            pc.pcPub.once(VideoRoomHandle.EVENT.VIDEOROOM_TALKING, (evtdata: any) => {
                console.log("VideoRoomHandle", 'talking', evtdata);
            });


            pc.pcPub.once(VideoRoomHandle.EVENT.VIDEOROOM_KICKED, async (evtdata: any) => {
                console.log("VideoRoomHandle", 'kicked', evtdata);
            });




        } catch (e) {
            console.log(e)
        }

    }
}


