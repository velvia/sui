// Copyright (c) 2022, Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { getObjectContent, getObjectExistsResponse } from '@mysten/sui.js';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DefaultRpcClient as rpc } from '../../utils/api/DefaultRpcClient';
import { IS_STATIC_ENV } from '../../utils/envUtil';
import { parseImageURL, parseObjectType } from '../../utils/objectUtils';
import { navigateWithUnknown } from '../../utils/searchUtil';
import {
    findDataFromID,
    findOwnedObjectsfromID,
} from '../../utils/static/searchUtil';
import {
    handleCoinType,
    processDisplayValue,
    trimStdLibPrefix,
} from '../../utils/stringUtils';
import DisplayBox from '../displaybox/DisplayBox';

import styles from './OwnedObjects.module.css';

type resultType = {
    id: string;
    Type: string;
    Version?: string;
    display?: string;
    balance?: number;
}[];

const DATATYPE_DEFAULT: resultType = [
    {
        id: '',
        Type: '',
    },
];

const IS_COIN_TYPE = (typeDesc: string): boolean => /::Coin::/.test(typeDesc);

const lastRowHas2Elements = (itemList: any[]): boolean =>
    itemList.length % 3 === 2;

const NoOwnedObjects = () => (
    <div className={styles.fail}>Failed to find Owned Objects</div>
);

const OwnedObject = ({ id }: { id: string }) =>
    IS_STATIC_ENV ? <OwnedObjectStatic id={id} /> : <OwnedObjectAPI id={id} />;

function OwnedObjectStatic({ id }: { id: string }) {
    const objects = findOwnedObjectsfromID(id);

    if (objects) {
        const results = objects?.map(({ objectId }) => {
            const entry = findDataFromID(objectId, undefined);
            return {
                id: entry?.id,
                Type: entry?.objType,
                Version: entry?.version,
                display: entry?.data?.contents?.display,
                balance: entry?.data?.contents?.balance,
            };
        });

        return <OwnedObjectLayout results={results} />;
    } else {
        return <NoOwnedObjects />;
    }
}

function OwnedObjectAPI({ id }: { id: string }) {
    const [results, setResults] = useState(DATATYPE_DEFAULT);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isFail, setIsFail] = useState(false);

    // TODO - The below will fail for a large number of owned objects
    // due to the number of calls to the API
    // Backend changes will be required to enable a scalable solution
    // getOwnedObjectRefs will need to return id, type and balance for each owned object
    useEffect(() => {
        setIsFail(false);
        setIsLoaded(false);
        rpc.getOwnedObjectRefs(id)
            .then((objects) => {
                const ids = objects.map(({ objectId }) => objectId);
                rpc.getObjectInfoBatch(ids).then((results) => {
                    setResults(
                        results
                            .filter(({ status }) => status === 'Exists')
                            .map(
                                (resp) => {
                                    const info = getObjectExistsResponse(resp)!;
                                    const contents = getObjectContent(resp);
                                    const url = parseImageURL(info.object);
                                    const balanceValue = (
                                        typeof contents?.fields.balance ===
                                        'number'
                                            ? contents.fields.balance
                                            : undefined
                                    ) as number;
                                    return {
                                        id: info.objectRef.objectId,
                                        Type: parseObjectType(info),
                                        display: url
                                            ? processDisplayValue(url)
                                            : undefined,
                                        balance: balanceValue,
                                    };
                                }
                                //TO DO - add back version
                            )
                    );
                    setIsLoaded(true);
                });
            })
            .catch(() => setIsFail(true));
    }, [id]);

    if (isFail) return <NoOwnedObjects />;

    if (isLoaded) return <OwnedObjectLayout results={results} />;

    return <div className={styles.gray}>loading...</div>;
}

function OwnedObjectLayout({ results }: { results: resultType }) {
    const coin_results = results.filter(({ Type }) => IS_COIN_TYPE(Type));
    const other_results = results
        .filter(({ Type }) => !IS_COIN_TYPE(Type))
        .sort((a, b) => {
            if (a.Type > b.Type) return 1;
            if (a.Type < b.Type) return -1;
            if (a.Type === b.Type) {
                return a.id <= b.id ? -1 : 1;
            }
            return 0;
        });

    return (
        <div>
            {coin_results.length > 0 && (
                <div>
                    <h2>Coins</h2>
                    <GroupView results={coin_results} />
                </div>
            )}
            {other_results.length > 0 && (
                <div id="NFTSection">
                    <h2>NFTs</h2>
                    <OwnedObjectSection results={other_results} />
                </div>
            )}
        </div>
    );
}

function GroupView({ results }: { results: resultType }) {
    const [subObjs, setSubObjs] = useState(DATATYPE_DEFAULT);

    const [isGroup, setIsGroup] = useState(true);

    const shrinkObjList = useCallback(
        (subObjList) => () => {
            setIsGroup(false);
            setSubObjs(subObjList);
        },
        []
    );

    const goBack = useCallback(() => setIsGroup(true), []);

    const uniqueTypes = Array.from(new Set(results.map(({ Type }) => Type)));

    if (isGroup) {
        return (
            <div id="groupCollection" className={styles.ownedobjects}>
                {uniqueTypes.map((typeV) => {
                    const subObjList = results.filter(
                        ({ Type }) => Type === typeV
                    );
                    return (
                        <div
                            key={typeV}
                            onClick={shrinkObjList(subObjList)}
                            className={styles.objectbox}
                        >
                            <div>
                                <div>
                                    <span>Type</span>
                                    <span>{handleCoinType(typeV)}</span>
                                </div>
                                <div>
                                    <span>Balance</span>
                                    <span>
                                        {IS_COIN_TYPE(typeV) &&
                                        subObjList.every(
                                            (el) => el.balance !== undefined
                                        )
                                            ? `${subObjList.reduce(
                                                  (prev, current) =>
                                                      prev + current.balance!,
                                                  0
                                              )}`
                                            : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {lastRowHas2Elements(uniqueTypes) && (
                    <div
                        className={`${styles.objectbox} ${styles.fillerbox}`}
                    />
                )}
            </div>
        );
    } else {
        return (
            <div>
                <div className={styles.paginationheading}>
                    <button onClick={goBack}>&#60; Back</button>
                    <h2>{handleCoinType(subObjs[0].Type)}</h2>
                </div>
                <OwnedObjectSection results={subObjs} />
            </div>
        );
    }
}
function OwnedObjectSection({ results }: { results: resultType }) {
    const [pageIndex, setPageIndex] = useState(0);

    const ITEMS_PER_PAGE = 12;

    const FINAL_PAGE_NO =
        Math.floor(results.length / ITEMS_PER_PAGE) +
        (results.length % ITEMS_PER_PAGE !== 0 ? 1 : 0);

    const objectSample = results.slice(
        pageIndex * ITEMS_PER_PAGE,
        (pageIndex + 1) * ITEMS_PER_PAGE
    );

    const OwnedObjectsRetrieved = (retrieved: resultType) => {
        return <OwnedObjectView results={objectSample} />;
    };

    const handleFirstClick = useCallback(() => setPageIndex(0), []);

    const handleBackClick = useCallback(
        () => pageIndex - 1 >= 0 && setPageIndex(pageIndex - 1),
        [pageIndex]
    );

    const handleNextClick = useCallback(
        () =>
            (pageIndex + 1) * ITEMS_PER_PAGE < results.length &&
            setPageIndex(pageIndex + 1),
        [pageIndex, results.length]
    );

    const handleLastClick = useCallback(
        () => setPageIndex(FINAL_PAGE_NO - 1),
        [FINAL_PAGE_NO]
    );

    return (
        <>
            {FINAL_PAGE_NO > 1 && (
                <>
                    <span className={pageIndex === 0 ? styles.gone : ''}>
                        <button
                            className={styles.btncontainer}
                            id="backBtn"
                            onClick={handleBackClick}
                            disabled={pageIndex === 0}
                        >
                            <svg
                                width="12"
                                height="12"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M 12 12 L 0 6 L 12 0"
                                    fill="transparent"
                                />
                            </svg>
                        </button>

                        <button
                            className={styles.btncontainer}
                            id="firstBtn"
                            onClick={handleFirstClick}
                            disabled={pageIndex === 0}
                        >
                            First
                        </button>
                    </span>

                    <span className={styles.pagenumber}>
                        Page {pageIndex + 1} of {FINAL_PAGE_NO}
                    </span>

                    <span
                        className={
                            pageIndex === FINAL_PAGE_NO - 1 ? styles.gone : ''
                        }
                    >
                        <button
                            id="lastBtn"
                            disabled={pageIndex === FINAL_PAGE_NO - 1}
                            onClick={handleLastClick}
                            className={styles.btncontainer}
                        >
                            Last
                        </button>
                        <button
                            id="nextBtn"
                            className={styles.btncontainer}
                            disabled={pageIndex === FINAL_PAGE_NO - 1}
                            onClick={handleNextClick}
                        >
                            <svg
                                width="12"
                                height="12"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M 0 12 L 12 6 L 0 0"
                                    fill="transparent"
                                />
                            </svg>
                        </button>
                    </span>
                </>
            )}

            {OwnedObjectsRetrieved(objectSample)}
        </>
    );
}
function OwnedObjectView({ results }: { results: resultType }) {
    const handlePreviewClick = useCallback(
        (id: string, navigate: Function) => (e: React.MouseEvent) =>
            navigateWithUnknown(id, navigate),
        []
    );
    const navigate = useNavigate();

    return (
        <div id="ownedObjects" className={styles.ownedobjects}>
            {results.map((entryObj, index1) => (
                <div
                    className={styles.objectbox}
                    key={`object-${index1}`}
                    onClick={handlePreviewClick(entryObj.id, navigate)}
                >
                    {entryObj.display !== undefined && (
                        <div className={styles.previewimage}>
                            <DisplayBox display={entryObj.display} />
                        </div>
                    )}
                    {Object.entries(entryObj).map(([key, value], index2) => (
                        <div key={`object-${index1}-${index2}`}>
                            {(() => {
                                switch (key) {
                                    case 'display':
                                        break;
                                    case 'Type':
                                        if (IS_COIN_TYPE(entryObj.Type)) {
                                            break;
                                        } else {
                                            return (
                                                <div>
                                                    <span>{key}</span>
                                                    <span>
                                                        {trimStdLibPrefix(
                                                            value as string
                                                        )}
                                                    </span>
                                                </div>
                                            );
                                        }
                                    default:
                                        if (
                                            key === 'balance' &&
                                            !IS_COIN_TYPE(entryObj.Type)
                                        )
                                            break;
                                        return (
                                            <div>
                                                <span>{key}</span>
                                                <span>{value}</span>
                                            </div>
                                        );
                                }
                            })()}
                        </div>
                    ))}
                </div>
            ))}
            {lastRowHas2Elements(results) && (
                <div className={`${styles.objectbox} ${styles.fillerbox}`} />
            )}
        </div>
    );
}

export default OwnedObject;
