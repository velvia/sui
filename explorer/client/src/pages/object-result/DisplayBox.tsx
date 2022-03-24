import { useState, useCallback } from 'react';

import { asciiFromNumberBytes } from '../../utils/internetapi/utility_functions';
import { type DataType } from './ObjectResultType';

import styles from './ObjectResult.module.css';

//TO DO - display smart contract info; see mock_data.json for example smart contract data
//import 'ace-builds/src-noconflict/theme-github';
//import AceEditor from 'react-ace';

function SmartContractBox({ data }: { data: DataType }) {
    return (
        <div className={styles.imagebox}>
            Displaying Smart Contracts Not yet Supported
        </div>
    );
    /*
           return (
                         <div className={styles['display-container']}>
                             <AceEditor
                                 theme="github"
                                 value={data.data.contents.display?.data}
                                 showGutter={true}
                                 readOnly={true}
                                 fontSize="0.8rem"
                                 className={styles.codebox}
                             />
                         </div>
                     );
                     */
}

function DisplayBox({ data }: { data: DataType }) {
    const [hasDisplayLoaded, setHasDisplayLoaded] = useState(false);

    const imageStyle = hasDisplayLoaded ? {} : { display: 'none' };
    const handleImageLoad = useCallback(
        () => setHasDisplayLoaded(true),
        [setHasDisplayLoaded]
    );

    const IS_SMART_CONTRACT = (data: any) =>
        data?.data?.contents?.display?.category === 'moveScript';
    if (IS_SMART_CONTRACT(data)) {
        return <SmartContractBox data={data} />;
    }

    if (data.data.contents.display) {
        if (
            typeof data.data.contents.display === 'object' &&
            'bytes' in data.data.contents.display
        )
            data.data.contents.display = asciiFromNumberBytes(
                data.data.contents.display.bytes
            );

        return (
            <div className={styles['display-container']}>
                {!hasDisplayLoaded && (
                    <div className={styles.imagebox}>
                        Please wait for display to load
                    </div>
                )}
                <img
                    className={styles.imagebox}
                    style={imageStyle}
                    alt="NFT"
                    src={data.data.contents.display}
                    onLoad={handleImageLoad}
                />
            </div>
        );
    }
    return <div />;
}

export default DisplayBox;
