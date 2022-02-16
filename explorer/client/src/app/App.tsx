import cn from 'classnames';
import { useCallback, useState } from 'react';
import { Container, Row, Col, Navbar, Button, Modal } from 'react-bootstrap';

import appStyles from './App.module.scss';

function App() {
    const [modalVisible, setModalVisible] = useState(false);
    const onHandleShowModal = useCallback(() => {
        setModalVisible(true);
    }, [setModalVisible]);
    const handleHideModal = useCallback(() => {
        setModalVisible(false);
    }, [setModalVisible]);
    return (
        <>
            <Navbar expand={true} variant="dark" bg="dark">
                <Container>
                    <Navbar.Brand>Sui Explorer</Navbar.Brand>
                </Container>
            </Navbar>
            <Container className={cn(appStyles.app, 'mt-1')}>
                <Row>
                    <Col>No transactions here yet</Col>
                </Row>
                <Row>
                    <Col>
                        <Button variant="secondary" onClick={onHandleShowModal}>
                            Open Modal
                        </Button>
                    </Col>
                </Row>
            </Container>
            <Modal show={modalVisible} onHide={handleHideModal}>
                <Modal.Header closeButton>
                    <Modal.Title>Hello</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>This is a demo</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleHideModal}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}

export default App;
