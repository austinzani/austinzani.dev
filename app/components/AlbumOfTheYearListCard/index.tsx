import React from 'react';
import {Database} from "../../../db_types";
import Icon from "../Icon";
import Modal from "../Modal";
import {OverlayTriggerState, useOverlayTriggerState} from "react-stately";
import {useOverlayTrigger} from "react-aria";
import {Button} from "../Button";

const RecentMusicCard = ({album, number, reveal_date}: {
    album: Database['public']['Tables']['albums_of_the_year']['Row'],
    number: number,
    reveal_date?: string
}) => {
    const [isModalOpen, setIsModalOpen] = React.useState(false);

    const openModal = () => {
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };
    return (
        <>
            <div onClick={openModal}
                 className={'max-w-md w-full flex mb-2 border border-gray-300 dark:border-zinc-700 p-2 items-center rounded bg-gray-100 dark:bg-zinc-800 relative'}>
                <h1 className={'absolute top-1 left-1 w-8 h-8 text-xl bg-orange-500 rounded-full flex items-center justify-center text-white'}>{number}</h1>
                <img className={"h-28 w-28"} src={album.album_art_url}/>
                <div className={'h-full flex justify-between w-full p-1'}>
                    <div className={'h-full flex flex-col p-1'}>
                        <h1 className={"text-2xl font-medium"}>{album.album}</h1>
                        <h3 className={"text-sm"}>{album.artist}</h3>
                    </div>
                </div>
            </div>
            <Modal isOpen={isModalOpen} closeModal={closeModal}>
                <div className={'flex flex-col sm:flex-row items-center max-w-full sm:max-w-[30rem] relative'}>
                    <div>
                    <div className={"sm:w-48 w-full min-w-[12rem] relative"}>
                        <img className={"min-h-48 min-w-48"} src={album.album_art_url}/>
                        <h1 className={'absolute -top-2 -left-2 w-8 h-8 text-xl bg-orange-500 rounded-full flex items-center justify-center text-white'}>{number}</h1>
                    </div>
                        <div className={'flex flex-row justify-center mt-2'}>
                            <a target="_blank" rel="noopener noreferrer" href={album.apple_link}
                               className={"h-10 text-2xl w-10 p-2.5 mx-1 flex items-center justify-center hover:bg-orange-500/60 hover:cursor-pointer rounded-md"}>
                                <Icon name={'apple'} prefix={'fab'}/>
                            </a>
                            <a target="_blank" rel="noopener noreferrer" href={album.spotify_link}
                               className={"h-10 text-2xl w-10 p-2.5 mx-1 flex items-center justify-center hover:bg-orange-500/60 hover:cursor-pointer rounded-md"}>
                                <Icon name={'spotify'} prefix={"fab"}/>
                            </a>
                            {album.vinyl_link &&
                                <a target="_blank" rel="noopener noreferrer" href={album.vinyl_link}
                                   className={"h-10 text-2xl w-10 p-2.5 mx-1 flex items-center justify-center hover:bg-orange-500/60 hover:cursor-pointer rounded-md"}>
                                    <Icon name={'record-vinyl'}/>
                                </a>
                            }
                        </div>
                    </div>
                    <div className={'flex flex-col sm: p-4'}>
                        <h1 className={"text-2xl"}>{album.album}</h1>
                        <h3 className={"text-md text-zinc-400"}>{album.artist}</h3>
                        {album.blurb && <p className={"text-sm mt-3 dark:text-gray-400"}>{album.blurb}</p>}
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default RecentMusicCard;

