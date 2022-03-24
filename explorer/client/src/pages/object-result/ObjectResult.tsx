//import 'ace-builds/src-noconflict/theme-github';
import React, { useEffect, useState } from 'react';
//import AceEditor from 'react-ace';
import { useLocation, useParams } from 'react-router-dom';

import ErrorResult from '../../components/error-result/ErrorResult';
import theme from '../../styles/theme.module.css';
import { DefaultRpcClient } from '../../utils/internetapi/rpc';
import ObjectLoaded from './ObjectLoaded';
import { type DataType } from './ObjectResultType';

const DATATYPE_DEFAULT: DataType = {
    id: '',
    category: '',
    owner: '',
    version: '',
    objType: '',
    data: {
        contents: {},
        owner: { ObjectOwner: [] },
        tx_digest: [],
    },
    loadState: 'pending',
};

function instanceOfDataType(object: any): object is DataType {
    return object && ['id', 'version', 'objType'].every((x) => x in object);
}

const Fail = ({ objID }: { objID: string | undefined }): JSX.Element => {
    return (
        <ErrorResult
            id={objID}
            errorMsg="There was an issue with the data on the following object"
        />
    );
};

const ObjectResultInternetAPI = ({ objID }: { objID: string }): JSX.Element => {
    const [showObjectState, setObjectState] = useState(DATATYPE_DEFAULT);
    const rpc = DefaultRpcClient;

    useEffect(() => {
        rpc.getObjectInfo(objID as string)
            .then((objState) => {
                setObjectState({
                    ...(objState as DataType),
                    loadState: 'loaded',
                });
            })
            .catch((error) => {
                console.log(error);
                setObjectState({ ...DATATYPE_DEFAULT, loadState: 'fail' });
            });
    }, [objID, rpc]);

    if (showObjectState.loadState === 'loaded') {
        return <ObjectLoaded data={showObjectState as DataType} />;
    }
    if (showObjectState.loadState === 'pending') {
        return (
            <div className={theme.pending}>Please wait for results to load</div>
        );
    }
    if (showObjectState.loadState === 'fail') {
        return <Fail objID={objID} />;
    }

    return <div>"Something went wrong"</div>;
};

const ObjectResultStatic = ({ objID }: { objID: string }): JSX.Element => {
    const { findDataFromID } = require('../../utils/static/utility_functions');
    const data = findDataFromID(objID, undefined);

    if (instanceOfDataType(data)) {
        return <ObjectLoaded data={data} />;
    } else {
        return <Fail objID={objID} />;
    }
};

const ObjectResult = (): JSX.Element => {
    const { id: objID } = useParams();
    const { state } = useLocation();

    if (instanceOfDataType(state)) {
        return <ObjectLoaded data={state} />;
    }

    if (objID !== undefined) {
        if (process.env.REACT_APP_DATA !== 'static') {
            return <ObjectResultInternetAPI objID={objID} />;
        } else {
            return <ObjectResultStatic objID={objID} />;
        }
    }

    return <Fail objID={objID} />;
};

export { ObjectResult };
export type { DataType };
