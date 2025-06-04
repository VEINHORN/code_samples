import { FunctionComponent } from 'react';
import { WithTranslation, useTranslation, withTranslation } from 'react-i18next';
import _ from 'lodash';

import i18n from 'i18next';
import { Control, FieldValues, FieldErrors } from 'react-hook-form';
import ControlledDropdown from '@one/react-spa-chassis/dist/src/components/form/dropdown/ControlledDropdown';
import ControlledDateInput from '@one/react-spa-chassis/dist/src/components/form/fields/ControlledDateInput';
import ControlledInputNumber from '@one/react-spa-chassis/dist/src/components/form/fields/ControlledInputNumber';
import ControlledInputText from '@one/react-spa-chassis/dist/src/components/form/fields/ControlledInputText';
import { UseFormClearErrors, UseFormSetValue } from 'react-hook-form/dist/types/form';
import {
	AssignmentSpecificDataInput,
	DateAssignmentSpecificData,
	DoubleAssignmentSpecificData,
	IntegerAssignmentSpecificData,
	Label,
	PayloadType,
	SelectionAssignmentSpecificData,
} from '@one/react-spa-chassis/dist/src/components/form/assignmentSpecificData/assignment-specific-data-model';

interface FormSpecificProps extends WithTranslation {
	disabled?: boolean;
	assignmentSpecificDataInputs: AssignmentSpecificDataInput[] | undefined;
	control: Control<FieldValues, any>;
	errors: FieldErrors<FieldValues>;
	onchangeEvent: () => void;
	clearErrors: UseFormClearErrors<FieldValues>;
	setValue: UseFormSetValue<FieldValues>;
}

const FormAssignmentSpecificData: FunctionComponent<FormSpecificProps> = ({
	disabled=false,
	assignmentSpecificDataInputs,
	control,
	errors,
	onchangeEvent = () => {},
	clearErrors,
	setValue,
}) => {
	const { t } = useTranslation();
	const isFieldDisabled = (assignmentSpecificData: { active: boolean; }) => {
		return !assignmentSpecificData.active || disabled;
	};
	const findLabel = (labels: Label[] | undefined, isActive: boolean): string => {
		const label = labels?.find((label) => label.language == i18n.language);
		const labelValue = _.isUndefined(label) ? '' : label.value;

		return isActive
			? labelValue
			: `${labelValue} [${t('labels.formPage.formAssignmentSpecificData.deactivated')}]`;
	};

	const renderSelectionField = (input: AssignmentSpecificDataInput) => {
		const selectionAssignmentSpecificData =
			input.assignmentSpecificData as SelectionAssignmentSpecificData;
		const selectionValues = _.isEmpty(selectionAssignmentSpecificData.selectionValues)
			? []
			: selectionAssignmentSpecificData.selectionValues.filter((value) => value.active);
		const options = selectionValues.map((data) => {
			const labels = data.labels?.map((l) => {
				return {
					language: _.isUndefined(l.language) ? '' : l.language,
					value: _.isUndefined(l.value) ? '' : l.value,
				};
			});

			return {
				value: data.id,
				label: findLabel(labels, input.assignmentSpecificData.active),
			};
		});

		return (
			<div key={input.assignmentSpecificData.id} className="field col-12" data-testid="dropdown">
				<ControlledDropdown
					name={`contract.assignmentSpecificData.${input.assignmentSpecificData.id}`}
					label={findLabel(
						input.assignmentSpecificData.labels,
						input.assignmentSpecificData.active,
					)}
					isRequired={input.assignmentSpecificData.required}
					disabled={isFieldDisabled(input.assignmentSpecificData)}
					options={options}
					optionLabel={'label'}
					setValue={setValue}
					showClear={true}
					control={control}
					errors={errors}
					onchangeEvent={onchangeEvent}
					clearErrors={clearErrors}
				/>
			</div>
		);
	};

	const renderDateField = (data: AssignmentSpecificDataInput) => {
		const dateAssignmentSpecificData = data.assignmentSpecificData as DateAssignmentSpecificData;
		const minDate = _.isUndefined(dateAssignmentSpecificData.minDate)
			? undefined
			: new Date(dateAssignmentSpecificData.minDate);
		const maxDate = _.isUndefined(dateAssignmentSpecificData.maxDate)
			? undefined
			: new Date(dateAssignmentSpecificData.maxDate);

		return (
			<div key={data.assignmentSpecificData.id} className="field col-12" data-testid="date-field">
				<ControlledDateInput
					name={`contract.assignmentSpecificData.${data.assignmentSpecificData.id}`}
					label={`${findLabel(data.assignmentSpecificData.labels, data.assignmentSpecificData.active)} (dd.MM.yyyy)`}
					isRequired={data.assignmentSpecificData.required}
					disabled={isFieldDisabled(data.assignmentSpecificData)}
					dateFormat="dd.mm.yy"
					minDate={minDate}
					maxDate={maxDate}
					control={control}
					errors={errors}
					onchangeEvent={onchangeEvent}
					clearErrors={clearErrors}
				/>
			</div>
		);
	};

	const renderDoubleField = (data: AssignmentSpecificDataInput) => {
		const doubleAssignmentSpecificData = data.assignmentSpecificData as DoubleAssignmentSpecificData;

		return (
			<div key={data.assignmentSpecificData.id} className="field col-12" data-testid="number-field">
				<ControlledInputNumber
					name={`contract.assignmentSpecificData.${data.assignmentSpecificData.id}`}
					label={findLabel(data.assignmentSpecificData.labels, data.assignmentSpecificData.active)}
					isRequired={data.assignmentSpecificData.required}
					disabled={isFieldDisabled(data.assignmentSpecificData)}
					maxFractionDigits={doubleAssignmentSpecificData.digits}
					control={control}
					errors={errors}
					onchangeEvent={onchangeEvent}
					clearErrors={clearErrors}
				/>
			</div>
		);
	};

	const renderIntegerField = (data: AssignmentSpecificDataInput) => {
		const integerAssignmentSpecificData = data.assignmentSpecificData as IntegerAssignmentSpecificData;

		return (
			<div key={data.assignmentSpecificData.id} className="field col-12" data-testid="number-field">
				<ControlledInputNumber
					name={`contract.assignmentSpecificData.${data.assignmentSpecificData.id}`}
					label={findLabel(data.assignmentSpecificData.labels, data.assignmentSpecificData.active)}
					isRequired={data.assignmentSpecificData.required}
					disabled={isFieldDisabled(data.assignmentSpecificData)}
					minValue={integerAssignmentSpecificData.minValue}
					maxValue={integerAssignmentSpecificData.maxValue}
					control={control}
					errors={errors}
					onchangeEvent={onchangeEvent}
					clearErrors={clearErrors}
				/>
			</div>
		);
	};

	const renderDefaultField = (data: AssignmentSpecificDataInput) => {
		return (
			<div key={data.assignmentSpecificData.id} className="field col-12" data-testid="field">
				<ControlledInputText
					name={`contract.assignmentSpecificData.${data.assignmentSpecificData.id}`}
					label={findLabel(data.assignmentSpecificData.labels, data.assignmentSpecificData.active)}
					isRequired={data.assignmentSpecificData.required}
					disabled={isFieldDisabled(data.assignmentSpecificData)}
					control={control}
					errors={errors}
					clearErrors={clearErrors}
					overrideProps={{maxLength: 50}}
				/>
			</div>
		);
	};

	const fields = _.isUndefined(assignmentSpecificDataInputs)
		? []
		: assignmentSpecificDataInputs.map((data) => {
				switch (data.assignmentSpecificData.payloadType) {
					case PayloadType.SelectionDataField:
						return renderSelectionField(data);
					case PayloadType.DateDataField:
						return renderDateField(data);
					case PayloadType.IntegerDataField:
						return renderIntegerField(data);
					case PayloadType.DoubleDataField:
						return renderDoubleField(data);
					default:
						return renderDefaultField(data);
				}
			});

	return <>{fields}</>;
};

export default withTranslation(['common'])(FormAssignmentSpecificData);
