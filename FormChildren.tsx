import { FunctionComponent, useEffect } from 'react';
import {
	Control,
	FieldErrors,
	FieldValues,
	useFieldArray,
	UseFormClearErrors,
	UseFormGetValues,
	UseFormSetValue,
} from 'react-hook-form';
import { WithTranslation, withTranslation } from 'react-i18next';

import { Button } from 'primereact/button';
import { Fieldset } from 'primereact/fieldset';
import { classNames } from 'primereact/utils';

import ControlledDropdown from '@one/react-spa-chassis/dist/src/components/form/dropdown/ControlledDropdown';
import ControlledDateInput from '@one/react-spa-chassis/dist/src/components/form/fields/ControlledDateInput';
import ControlledInputText from '@one/react-spa-chassis/dist/src/components/form/fields/ControlledInputText';
import formPageCss from '@src/components/employee/form/formPage.module.css';
import { child } from '@src/components/employee/form/employee-validation-schema';
import '@src/components/employee/form/customDropDown.css';
import { getCountryCodes, getSsnLabel } from '@src/components/employee/form/SocialSecurityNumberUtils';
import fetchBasicData from '@src/components/employee/form/BasicDataFetch';
import { BasicDataGroup, BasicDataGroupSorting } from '@one/react-spa-chassis/dist/src/utils/basicDataUtils';

interface FormChildrenProps extends WithTranslation {
	disabled: boolean;
	control: Control<FieldValues, any>;
	errors: FieldErrors<FieldValues>;
	children: any;
	initiateSave: () => Promise<void>;
	onchangeEvent: () => void;
	data: FieldValues;
	clearErrors: UseFormClearErrors<FieldValues>;
	setValue: UseFormSetValue<FieldValues>;
	getValues: UseFormGetValues<FieldValues>;
}

const FormChildren: FunctionComponent<FormChildrenProps> = ({
	t,
	disabled,
	errors,
	control,
	children,
	initiateSave,
	onchangeEvent = () => {},
	data,
	clearErrors,
	setValue,
	getValues,
}) => {
	useEffect(() => {
		replace(children);
	}, [children]);

	const { fields, append, remove, replace } = useFieldArray({
		name: 'person.children',
		control,
	});

	const { data: degreeOfRelation, basicDataControlLabel: relationshipLabel } = fetchBasicData(
		`${BasicDataGroup.RELATIONSHIP}`,
		BasicDataGroupSorting[BasicDataGroup.RELATIONSHIP],
	);

	function renderChildrenHeader(index: number) {
		return (
			<div className="flex align-items-center text-primary">
				<span className="pi pi-user mr-2"></span>
				<span className="font-bold text-lg">
					{t('labels.formPage.children.header')} {index + 1}
				</span>
			</div>
		);
	}

	return (
		<>
			<div className={classNames('field col-12', formPageCss.addChildren)}>
				<Button
					disabled={disabled}
					type={'button'}
					onClick={() => {
						append({});
					}}
					rounded
					label={`${t('labels.formPage.children.button.add')}`}
				/>
			</div>
			<div className="field col-12">
				{fields.map((field, index) => {
					let childKey = index;
					return (
						<div className={formPageCss.childWrapper} key={`fieldset_wrapper_${childKey}`}>
							<Fieldset
								key={`fieldset_${childKey}`}
								id={`fieldset_${childKey}`}
								legend={renderChildrenHeader(index)}
							>
								<div className="formgrid grid">
									<div className={classNames('field col-12', formPageCss.deleteChildren)}>
										<Button
											disabled={disabled}
											key={`fieldset_delete_${childKey}`}
											icon="pi pi-trash"
											rounded
											severity={'danger'}
											onClick={() => {
												remove(index);
												initiateSave();
											}}
											aria-label="Delete"
										/>
									</div>
									<div className="field col-6">
										<ControlledInputText
											key={`fieldset_firstName_${childKey}`}
											name={`person.children.${childKey}.firstName`}
											label={t('labels.formPage.children.firstName')}
											isRequired={!child.shape.firstName.isOptional()}
											disabled={disabled}
											control={control}
											errors={errors}
											clearErrors={clearErrors}
											overrideProps={{maxLength: 70}}
										/>
									</div>
									<div className="field col-6">
										<ControlledInputText
											key={`fieldset_lastName_${childKey}`}
											name={`person.children.${childKey}.lastName`}
											label={t('labels.formPage.children.lastName')}
											isRequired={!child.shape.lastName.isOptional()}
											disabled={disabled}
											control={control}
											errors={errors}
											clearErrors={clearErrors}
											overrideProps={{maxLength: 70}}
										/>
									</div>
									<div className="field col-2 custom-dropdown">
										<ControlledDropdown
											name={`person.children.${childKey}.ssnCountryCode`}
											label={t('labels.formPage.person.ssnCountryCode')}
											isRequired={!child.shape.ssnCountryCode.isOptional()}
											disabled={disabled}
											options={getCountryCodes(t)}
											setValue={setValue}
											control={control}
											errors={errors}
											onchangeEvent={onchangeEvent}
											showClear={child.shape.ssnCountryCode.isOptional()}
											clearErrors={clearErrors}
										/>
									</div>
									<div className="field col-10">
										<ControlledInputText
											key={`fieldset_socialSecurityNumber_${childKey}`}
											name={`person.children.${childKey}.socialSecurityNumber`}
											label={getSsnLabel(
												t,
												getValues(`person.children.${childKey}.ssnCountryCode`)
											)}
											isRequired={!child.shape.socialSecurityNumber.isOptional()}
											disabled={disabled}
											control={control}
											errors={errors}
											clearErrors={clearErrors}
											overrideProps={{maxLength: 30}} // Updated
										/>
									</div>
									<div className="field col-6">
										<ControlledDateInput
											key={`fieldset_dateOfBirth_${childKey}`}
											name={`person.children.${childKey}.dateOfBirth`}
											label={t('labels.formPage.children.dateOfBirth')}
											isRequired={!child.shape.dateOfBirth.isOptional()}
											disabled={disabled}
											dateFormat="dd.mm.yy"
											control={control}
											errors={errors}
											onchangeEvent={onchangeEvent}
											clearErrors={clearErrors}
										/>
									</div>
									<div className="field col-6">
										<ControlledDropdown
											key={`fieldset_degreeOfRelation_${childKey}`}
											name={`person.children.${childKey}.degreeOfRelation`}
											label={relationshipLabel || t('labels.formPage.children.degreeOfRelation')}
											isRequired={!child.shape.degreeOfRelation.isOptional()}
											disabled={disabled}
											options={degreeOfRelation}
											optionLabel={'label'}
											setValue={setValue}
											showClear={true}
											control={control}
											errors={errors}
											onchangeEvent={onchangeEvent}
											clearErrors={clearErrors}
										/>
									</div>
								</div>
							</Fieldset>
						</div>
					);
				})}
			</div>
		</>
	);
};
export default withTranslation(['common'])(FormChildren);