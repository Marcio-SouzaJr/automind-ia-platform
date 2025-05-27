// src/components/dashboard_widgets/CardNumberWidget.tsx
import React from 'react';
import Card from 'react-bootstrap/Card';

interface CardNumberWidgetProps {
    title: string;
    value: any;
    unit?: string;
    precision?: number;
    description?: string; // Opcional: uma pequena descrição ou contexto
}

const CardNumberWidget: React.FC<CardNumberWidgetProps> = ({ title, value, unit, precision = 0, description }) => {
    let displayValue = value;

    if (value === undefined || value === null) {
        displayValue = 'N/A';
    } else if (typeof value === 'number') {
        displayValue = value.toFixed(precision);
    }
    // Se value já for uma string formatada, usa como está

    return (
        <Card style={{ minWidth: '200px', margin: '10px', textAlign: 'center' }} bg="dark">
            <Card.Header as="h6">{title}</Card.Header>
            <Card.Body>
                <Card.Title style={{ fontSize: '2.8rem', fontWeight: 'bold', margin: '15px 0' }}>
                    {String(displayValue)}
                    {unit && typeof value === 'number' && <span style={{ fontSize: '1.2rem', fontWeight: 'normal', marginLeft: '5px' }}>{unit}</span>}
                </Card.Title>
                {description && <Card.Text className="text-muted">{description}</Card.Text>}
            </Card.Body>
        </Card>
    );
};

export default CardNumberWidget;